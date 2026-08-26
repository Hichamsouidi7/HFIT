import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { mealPlans, pantry, shoppingItems } from "@/db/schema";
import { GeminiUnavailable, generateJSON, isConfigured } from "@/lib/gemini";
import { todayISO, weekStart } from "@/lib/day";
import { getCurrentWeight, getDayView, getProfile, toEngineProfile } from "@/lib/queries";
import { dailyPlan } from "@/lib/nutrition";
import { CHALLENGE, stepsGoalForDayNumber } from "@/content/challenge-21";

/**
 * The week's meal plan, plus the shopping list that follows from it.
 *
 * Built around batch cooking rather than seven different dinners: the plan is
 * only useful if it is actually cooked, and on a deficit the failure mode is
 * "nothing prepared, so I ate whatever was there". Repeating a handful of
 * dishes is a feature, not laziness.
 */

export const maxDuration = 90;

const SCHEMA = {
  type: "object",
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          weekday: { type: "string" },
          meals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                meal: { type: "string", enum: ["petit-dejeuner", "dejeuner", "diner", "collation"] },
                name: { type: "string" },
                quickNote: { type: "string" },
                kcal: { type: "number" },
                proteinG: { type: "number" },
                fatG: { type: "number" },
                carbsG: { type: "number" },
              },
              required: ["meal", "name", "kcal", "proteinG", "fatG", "carbsG"],
            },
          },
        },
        required: ["weekday", "meals"],
      },
    },
    batches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
          covers: { type: "string" },
        },
        required: ["name", "quantity", "covers"],
      },
    },
    shopping: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
          aisle: { type: "string" },
        },
        required: ["name", "quantity", "aisle"],
      },
    },
  },
  required: ["days", "batches", "shopping"],
} as const;

const SYSTEM = `Tu construis un plan alimentaire de 7 jours pour une sèche à fort déficit.

Règles :
- Chaque journée doit approcher les cibles données : les PROTÉINES sont prioritaires et ne doivent jamais être sous la cible. Les calories ne doivent pas dépasser.
- Conçois pour le batch cooking : 3 ou 4 préparations cuisinées d'un coup couvrent la semaine. Répète les plats, c'est voulu — un plan trop varié ne se cuisine pas.
- Le petit-déjeuner et les collations peuvent être identiques tous les jours, c'est même préférable.
- Cuisine française simple, ingrédients de supermarché, rien d'exotique.
- "quickNote" : une indication très courte de préparation ou de quantité (ex. « 150 g cuit, réchauffé »).
- Les macros doivent être cohérentes : kcal ≈ protéines×4 + lipides×9 + glucides×4.
- "batches" : ce qu'il cuisine le dimanche, avec les quantités TOTALES pour la semaine.
- "shopping" : la liste de courses complète, groupée par rayon ("Boucherie", "Crèmerie", "Fruits et légumes", "Épicerie", "Surgelés"), avec des quantités achetables.
- Tout en français.`;

export async function GET() {
  const week = weekStart(todayISO());
  const [plan] = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.weekStart, week))
    .orderBy(desc(mealPlans.createdAt))
    .limit(1);

  if (!plan) return NextResponse.json({ plan: null, shopping: [] });

  const shopping = await db
    .select()
    .from(shoppingItems)
    .where(eq(shoppingItems.mealPlanId, plan.id))
    .orderBy(asc(shoppingItems.aisle), asc(shoppingItems.name));

  return NextResponse.json({ plan, shopping });
}

export async function POST() {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "L'IA n'est pas configurée : ajoute GEMINI_API_KEY dans les variables Vercel." },
      { status: 503 },
    );
  }

  const profileRow = await getProfile();
  if (!profileRow) return NextResponse.json({ error: "Profil manquant." }, { status: 400 });

  const day = todayISO();
  const week = weekStart(day);
  const view = await getDayView(day);

  // Targets for a typical training day of the week ahead, so the plan is built
  // against the same numbers the app will judge each day by.
  const currentWeight = await getCurrentWeight(profileRow);
  const typical = view
    ? {
        kcal: view.log.kcalGoal,
        proteinG: view.log.proteinGoalG,
        fatG: view.log.fatGoalG,
        carbsG: view.log.carbsGoalG,
      }
    : dailyPlan(toEngineProfile(profileRow, currentWeight), {
        stepsGoal: stepsGoalForDayNumber(1),
        workoutPlannedMinutes: CHALLENGE.sessionMinutes,
      }).targets;

  const pantryItems = await db.select().from(pantry).orderBy(asc(pantry.name));

  const prompt = `Cibles quotidiennes :
- ${typical.kcal} kcal
- ${typical.proteinG} g de protéines (plancher, à atteindre chaque jour)
- ${typical.fatG} g de lipides
- ${typical.carbsG} g de glucides

${pantryItems.length > 0 ? `Déjà dans les placards (à utiliser en priorité) :\n${pantryItems.map((i) => `- ${i.name}`).join("\n")}\n` : ""}
${profileRow.allergies ? `Allergies à éviter absolument : ${profileRow.allergies}.` : ""}
${profileRow.dislikedFoods ? `N'aime pas : ${profileRow.dislikedFoods}.` : ""}

Construis le plan des 7 jours (lundi à dimanche), les préparations à faire d'avance, et la liste de courses.`;

  try {
    const result = await generateJSON<{
      days: {
        weekday: string;
        meals: {
          meal: string;
          name: string;
          quickNote?: string;
          kcal: number;
          proteinG: number;
          fatG: number;
          carbsG: number;
        }[];
      }[];
      batches: { name: string; quantity: string; covers: string }[];
      shopping: { name: string; quantity: string; aisle: string }[];
    }>({
      prompt,
      schema: SCHEMA as unknown as Record<string, unknown>,
      systemInstruction: SYSTEM,
      temperature: 0.7,
    });

    // Energy recomputed from macros, same rule as everywhere else: the macros
    // are what the day is measured against.
    const days = result.days.map((d) => ({
      weekday: d.weekday,
      meals: d.meals.map((m) => {
        const proteinG = Math.max(0, Math.round(m.proteinG));
        const fatG = Math.max(0, Math.round(m.fatG));
        const carbsG = Math.max(0, Math.round(m.carbsG));
        return {
          meal: m.meal,
          name: m.name,
          quickNote: m.quickNote ?? null,
          proteinG,
          fatG,
          carbsG,
          kcal: proteinG * 4 + fatG * 9 + carbsG * 4,
        };
      }),
    }));

    // One plan per week: regenerating replaces it rather than stacking.
    const existing = await db
      .select({ id: mealPlans.id })
      .from(mealPlans)
      .where(eq(mealPlans.weekStart, week));
    for (const row of existing) {
      await db.delete(mealPlans).where(eq(mealPlans.id, row.id));
    }

    const [plan] = await db
      .insert(mealPlans)
      .values({ weekStart: week, plan: { days, batches: result.batches, targets: typical } })
      .returning();

    const shopping =
      result.shopping.length > 0
        ? await db
            .insert(shoppingItems)
            .values(
              result.shopping.map((s) => ({
                mealPlanId: plan.id,
                name: s.name,
                quantity: s.quantity,
                aisle: s.aisle,
              })),
            )
            .returning()
        : [];

    return NextResponse.json({ plan, shopping });
  } catch (error) {
    if (error instanceof GeminiUnavailable) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Plan impossible à générer. Réessaie." }, { status: 500 });
  }
}
