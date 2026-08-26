import { NextResponse } from "next/server";
import { db } from "@/db";
import { foodEntries } from "@/db/schema";
import { todayISO } from "@/lib/day";

const MEALS = ["petit-dejeuner", "dejeuner", "diner", "collation"];

interface Item {
  name: string;
  quantityG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/**
 * Adds several foods at once. Used by the photo estimate, where one plate
 * becomes four or five separate entries the user has already reviewed.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    items?: Item[];
    meal?: string;
    day?: string;
    aiEstimated?: boolean;
  };

  const meal = MEALS.includes(body.meal ?? "") ? body.meal! : "collation";
  const day = body.day ?? todayISO();
  const items = (body.items ?? []).filter(
    (i) =>
      i.name &&
      Number.isFinite(i.quantityG) &&
      i.quantityG > 0 &&
      i.quantityG <= 5000 &&
      [i.kcal, i.proteinG, i.fatG, i.carbsG].every(Number.isFinite),
  );

  if (items.length === 0) {
    return NextResponse.json({ error: "Aucun aliment valide à ajouter." }, { status: 400 });
  }

  const round = (n: number) => Math.round(n * 10) / 10;

  await db.insert(foodEntries).values(
    items.map((i) => ({
      day,
      meal,
      name: i.name,
      quantityG: round(i.quantityG),
      kcal: round(i.kcal),
      proteinG: round(i.proteinG),
      fatG: round(i.fatG),
      carbsG: round(i.carbsG),
      aiEstimated: body.aiEstimated ?? true,
    })),
  );

  return NextResponse.json({ ok: true, added: items.length });
}
