import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { pantry, recipes } from "@/db/schema";
import { GeminiUnavailable, generateJSON, isConfigured } from "@/lib/gemini";
import { todayISO } from "@/lib/day";
import { getDayTotals, getDayView, getProfile } from "@/lib/queries";

/**
 * Generates meal ideas that fit what is left of the day AND what is actually in
 * the kitchen.
 *
 * The constraint that makes this useful rather than generic: the model may only
 * use ingredients from the pantry list, plus a short set of seasonings everyone
 * has. A recipe that needs a trip to the shop is not an answer to "what do I eat
 * tonight".
 */

export const maxDuration = 60;

const SCHEMA = {
  type: "object",
  properties: {
    recipes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          why: { type: "string" },
          prepMinutes: { type: "number" },
          servings: { type: "number" },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantityG: { type: "number" },
                display: { type: "string" },
              },
              required: ["name", "display"],
            },
          },
          steps: { type: "array", items: { type: "string" } },
          kcalPerServing: { type: "number" },
          proteinPerServing: { type: "number" },
          fatPerServing: { type: "number" },
          carbsPerServing: { type: "number" },
          missingIngredients: { type: "array", items: { type: "string" } },
        },
        required: [
          "name",
          "why",
          "prepMinutes",
          "servings",
          "ingredients",
          "steps",
          "kcalPerServing",
          "proteinPerServing",
          "fatPerServing",
          "carbsPerServing",
        ],
      },
    },
  },
  required: ["recipes"],
} as const;

const SYSTEM = `Tu es un chef spécialisé en cuisine de sèche : beaucoup de protéines, peu de calories, et surtout des plats qu'on a envie de manger.

Règles absolues :
- Tu n'utilises QUE les ingrédients de la liste fournie, plus ces basiques supposés présents : sel, poivre, épices, herbes, vinaigre, moutarde, citron, ail, oignon, huile (en quantité comptée).
- Si un ingrédient te manque pour rendre la recette correcte, tu le mets dans "missingIngredients" — jamais dans "ingredients".
- Chaque recette doit RENTRER dans les calories restantes indiquées et pousser au maximum les protéines restantes.
- Les quantités sont en grammes, réalistes et pesables.
- Les macros par portion doivent être cohérentes : kcal ≈ protéines×4 + lipides×9 + glucides×4.
- Les étapes sont courtes, numérotées mentalement, exécutables par quelqu'un qui ne cuisine pas.
- "why" explique en UNE phrase pourquoi cette recette convient à ce moment de la journée.
- Tout est en français.
- Tu proposes 3 recettes nettement différentes les unes des autres.`;

const FALLBACK_INGREDIENTS = [
  "blanc de poulet",
  "oeufs",
  "skyr ou fromage blanc 0%",
  "thon au naturel",
  "riz",
  "flocons d'avoine",
  "légumes surgelés",
  "tomates",
  "salade",
];

export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "L'IA n'est pas configurée : ajoute GEMINI_API_KEY dans les variables Vercel." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    meal?: string;
    maxMinutes?: number;
    onlyPantry?: boolean;
  };

  const profileRow = await getProfile();
  if (!profileRow) {
    return NextResponse.json({ error: "Profil manquant." }, { status: 400 });
  }

  const day = todayISO();
  const view = await getDayView(day);
  const totals = await getDayTotals(day);
  if (!view) return NextResponse.json({ error: "Profil manquant." }, { status: 400 });

  const kcalLeft = Math.max(150, view.budget.budgetKcal - totals.kcal);
  const proteinLeft = Math.max(0, view.log.proteinGoalG - totals.proteinG);
  const fatLeft = Math.max(0, view.log.fatGoalG - totals.fatG);
  const carbsLeft = Math.max(0, view.log.carbsGoalG - totals.carbsG);

  const pantryItems = await db.select().from(pantry).orderBy(asc(pantry.name));
  const available =
    pantryItems.length > 0
      ? pantryItems.map((i) => (i.quantity ? `${i.name} (${i.quantity})` : i.name))
      : FALLBACK_INGREDIENTS;

  const prompt = `Ingrédients disponibles${pantryItems.length === 0 ? " (frigo non renseigné, pars de ces basiques)" : ""} :
${available.map((i) => `- ${i}`).join("\n")}

Ce qu'il reste à manger aujourd'hui :
- Calories restantes : ${kcalLeft} kcal (à ne pas dépasser)
- Protéines restantes à atteindre : ${proteinLeft} g (objectif prioritaire)
- Lipides restants : ${fatLeft} g
- Glucides restants : ${carbsLeft} g

Repas visé : ${body.meal ?? "le prochain repas"}.
Temps de préparation maximum : ${body.maxMinutes ?? 25} minutes.
${profileRow.allergies ? `Allergies à éviter absolument : ${profileRow.allergies}.` : ""}
${profileRow.dislikedFoods ? `Aliments qu'il n'aime pas : ${profileRow.dislikedFoods}.` : ""}

Propose 3 recettes.`;

  try {
    const result = await generateJSON<{
      recipes: {
        name: string;
        why: string;
        prepMinutes: number;
        servings: number;
        ingredients: { name: string; quantityG?: number; display: string }[];
        steps: string[];
        kcalPerServing: number;
        proteinPerServing: number;
        fatPerServing: number;
        carbsPerServing: number;
        missingIngredients?: string[];
      }[];
    }>({
      prompt,
      schema: SCHEMA as unknown as Record<string, unknown>,
      systemInstruction: SYSTEM,
      temperature: 0.85,
    });

    const saved = [];
    for (const r of (result.recipes ?? []).slice(0, 3)) {
      // Recompute energy from the macros: the macros are what the day is
      // measured against, so they win over whatever kcal the model wrote.
      const protein = Math.max(0, Math.round(r.proteinPerServing));
      const fat = Math.max(0, Math.round(r.fatPerServing));
      const carbs = Math.max(0, Math.round(r.carbsPerServing));

      const [row] = await db
        .insert(recipes)
        .values({
          name: r.name,
          ingredients: r.ingredients,
          steps: r.steps,
          servings: Math.max(1, Math.round(r.servings || 1)),
          kcalPerServing: protein * 4 + fat * 9 + carbs * 4,
          proteinPerServing: protein,
          fatPerServing: fat,
          carbsPerServing: carbs,
          prepMinutes: Math.round(r.prepMinutes || 0),
          tags: {
            why: r.why,
            missing: r.missingIngredients ?? [],
            meal: body.meal ?? null,
          },
          source: "ai",
        })
        .returning();

      saved.push(row);
    }

    return NextResponse.json({
      recipes: saved,
      context: { kcalLeft, proteinLeft, usedPantry: pantryItems.length > 0 },
    });
  } catch (error) {
    if (error instanceof GeminiUnavailable) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Génération impossible. Réessaie." }, { status: 500 });
  }
}
