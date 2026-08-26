import { NextResponse } from "next/server";
import { eq, not } from "drizzle-orm";
import { db } from "@/db";
import { foodEntries, recipes } from "@/db/schema";
import { todayISO } from "@/lib/day";

/** Toggle favourite, or log the recipe as an eaten meal. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const recipeId = Number(id);
  const body = (await request.json().catch(() => ({}))) as {
    action?: "favorite" | "log";
    meal?: string;
    servings?: number;
    day?: string;
  };

  if (!Number.isInteger(recipeId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1);
  if (!recipe) return NextResponse.json({ error: "Recette introuvable." }, { status: 404 });

  if (body.action === "favorite") {
    const [updated] = await db
      .update(recipes)
      .set({ isFavorite: not(recipes.isFavorite) })
      .where(eq(recipes.id, recipeId))
      .returning({ isFavorite: recipes.isFavorite });
    return NextResponse.json({ ok: true, isFavorite: updated?.isFavorite ?? false });
  }

  if (body.action === "log") {
    const servings = Math.max(0.25, Math.min(6, Number(body.servings) || 1));
    const round = (n: number) => Math.round(n * servings * 10) / 10;

    await db.insert(foodEntries).values({
      day: body.day ?? todayISO(),
      meal: body.meal ?? "diner",
      name: recipe.name,
      // A recipe is logged as a single line: its parts are already accounted
      // for inside the per-serving macros, so listing them again would double.
      quantityG: 0,
      kcal: round(recipe.kcalPerServing),
      proteinG: round(recipe.proteinPerServing),
      fatG: round(recipe.fatPerServing),
      carbsG: round(recipe.carbsPerServing),
      aiEstimated: recipe.source === "ai",
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const recipeId = Number(id);
  if (!Number.isInteger(recipeId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }
  await db.delete(recipes).where(eq(recipes.id, recipeId));
  return NextResponse.json({ ok: true });
}
