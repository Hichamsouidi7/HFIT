import { NextResponse } from "next/server";
import { db } from "@/db";
import { foods } from "@/db/schema";
import { normalizeForSearch } from "@/lib/search";

/** Creates a food by hand, for anything neither CIQUAL nor a barcode covers. */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    brand?: string;
    kcal100?: number;
    protein100?: number;
    fat100?: number;
    carbs100?: number;
    defaultPortionG?: number;
  };

  const name = (body.name ?? "").trim();
  const values = {
    kcal: Number(body.kcal100),
    protein: Number(body.protein100),
    fat: Number(body.fat100),
    carbs: Number(body.carbs100),
  };

  if (name.length < 2) {
    return NextResponse.json({ error: "Donne un nom à l'aliment." }, { status: 400 });
  }
  if (!Object.values(values).every((v) => Number.isFinite(v) && v >= 0 && v < 1000)) {
    return NextResponse.json({ error: "Valeurs nutritionnelles invalides." }, { status: 400 });
  }

  const brand = body.brand?.trim() || null;
  const portion = Number(body.defaultPortionG);

  const [food] = await db
    .insert(foods)
    .values({
      source: "custom",
      name,
      searchName: normalizeForSearch(`${name} ${brand ?? ""}`),
      brand,
      kcal100: values.kcal,
      protein100: values.protein,
      fat100: values.fat,
      carbs100: values.carbs,
      defaultPortionG: Number.isFinite(portion) && portion > 0 ? portion : 100,
      isFavorite: true,
    })
    .returning();

  return NextResponse.json({ ok: true, food });
}
