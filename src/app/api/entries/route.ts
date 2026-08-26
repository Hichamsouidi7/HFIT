import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { foodEntries, foods } from "@/db/schema";
import { todayISO } from "@/lib/day";

const MEALS = ["petit-dejeuner", "dejeuner", "diner", "collation"];

interface Body {
  foodId?: number;
  name?: string;
  quantityG?: number;
  meal?: string;
  day?: string;
  kcal100?: number;
  protein100?: number;
  fat100?: number;
  carbs100?: number;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const quantityG = Number(body.quantityG);
  const meal = MEALS.includes(body.meal ?? "") ? body.meal! : "collation";
  const day = body.day ?? todayISO();

  if (!Number.isFinite(quantityG) || quantityG <= 0 || quantityG > 5000) {
    return NextResponse.json({ error: "Quantité invalide." }, { status: 400 });
  }

  let per100 = {
    name: body.name ?? "",
    kcal: Number(body.kcal100),
    protein: Number(body.protein100),
    fat: Number(body.fat100),
    carbs: Number(body.carbs100),
  };

  if (body.foodId) {
    const [food] = await db.select().from(foods).where(eq(foods.id, body.foodId)).limit(1);
    if (!food) return NextResponse.json({ error: "Aliment introuvable." }, { status: 404 });

    per100 = {
      name: food.name,
      kcal: food.kcal100,
      protein: food.protein100,
      fat: food.fat100,
      carbs: food.carbs100,
    };

    // Most-used foods float to the top of the search, so his staples are one tap.
    await db
      .update(foods)
      .set({ useCount: sql`${foods.useCount} + 1` })
      .where(eq(foods.id, food.id));
  }

  if (!per100.name || ![per100.kcal, per100.protein, per100.fat, per100.carbs].every(Number.isFinite)) {
    return NextResponse.json({ error: "Aliment incomplet." }, { status: 400 });
  }

  const factor = quantityG / 100;
  const round = (n: number) => Math.round(n * 10) / 10;

  // Macros are COPIED, never joined: fixing a food later must not rewrite history.
  const [entry] = await db
    .insert(foodEntries)
    .values({
      day,
      meal,
      foodId: body.foodId ?? null,
      name: per100.name,
      quantityG,
      kcal: round(per100.kcal * factor),
      proteinG: round(per100.protein * factor),
      fatG: round(per100.fat * factor),
      carbsG: round(per100.carbs * factor),
      aiEstimated: false,
    })
    .returning();

  return NextResponse.json({ ok: true, entry });
}
