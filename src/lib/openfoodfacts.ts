import { eq } from "drizzle-orm";
import { db } from "@/db";
import { foods } from "@/db/schema";
import { normalizeForSearch } from "@/lib/search";

/**
 * Open Food Facts lookup by barcode.
 *
 * No key, no signup, and very good coverage of French supermarket products —
 * which is exactly the gap CIQUAL leaves (it covers raw and home-cooked foods,
 * not packaged ones).
 */

const FIELDS = [
  "product_name",
  "product_name_fr",
  "brands",
  "nutriments",
  "serving_quantity",
  "serving_size",
  "quantity",
].join(",");

interface OffNutriments {
  "energy-kcal_100g"?: number;
  "energy_100g"?: number;
  proteins_100g?: number;
  fat_100g?: number;
  carbohydrates_100g?: number;
  fiber_100g?: number;
}

interface OffResponse {
  status?: number;
  product?: {
    product_name?: string;
    product_name_fr?: string;
    brands?: string;
    nutriments?: OffNutriments;
    serving_quantity?: number | string;
    serving_size?: string;
  };
}

export interface ResolvedFood {
  id: number;
  name: string;
  brand: string | null;
  kcal100: number;
  protein100: number;
  fat100: number;
  carbs100: number;
  defaultPortionG: number;
  portionLabel: string | null;
  source: string;
}

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Finds a product by barcode, caching it into the local catalogue.
 *
 * Caching matters for more than speed: once a product is a row in `foods`, it
 * shows up in text search and in "most used", so a product only ever has to be
 * scanned once.
 */
export async function findByBarcode(barcode: string): Promise<ResolvedFood | null> {
  const code = barcode.replace(/\D/g, "");
  if (code.length < 6) return null;

  const cached = await db.select().from(foods).where(eq(foods.barcode, code)).limit(1);
  if (cached[0]) return cached[0] as ResolvedFood;

  let payload: OffResponse;
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`,
      {
        headers: {
          // Open Food Facts asks every client to identify itself.
          "User-Agent": "HFit/1.0 (personal weight-loss app)",
        },
        signal: AbortSignal.timeout(9000),
      },
    );
    if (!response.ok) return null;
    payload = (await response.json()) as OffResponse;
  } catch {
    return null;
  }

  const product = payload.product;
  if (!product || payload.status === 0) return null;

  const nutriments = product.nutriments ?? {};
  // Some products only carry kilojoules; 1 kcal = 4.184 kJ.
  const kcal =
    num(nutriments["energy-kcal_100g"]) ??
    (num(nutriments["energy_100g"]) !== null
      ? Math.round(num(nutriments["energy_100g"])! / 4.184)
      : null);

  const protein = num(nutriments.proteins_100g);
  const fat = num(nutriments.fat_100g);
  const carbs = num(nutriments.carbohydrates_100g);

  // A product with no energy value is useless here, and guessing would be worse
  // than saying so: the caller offers manual entry instead.
  if (kcal === null || protein === null || fat === null || carbs === null) return null;

  const name = (product.product_name_fr || product.product_name || "").trim();
  if (!name) return null;

  const brand = product.brands ? product.brands.split(",")[0].trim() : null;
  const servingG = num(product.serving_quantity);

  const [inserted] = await db
    .insert(foods)
    .values({
      source: "off",
      externalId: code,
      barcode: code,
      name,
      searchName: normalizeForSearch(`${name} ${brand ?? ""}`),
      brand,
      kcal100: Math.round(kcal * 10) / 10,
      protein100: Math.round(protein * 10) / 10,
      fat100: Math.round(fat * 10) / 10,
      carbs100: Math.round(carbs * 10) / 10,
      fiber100: num(nutriments.fiber_100g),
      defaultPortionG: servingG && servingG > 0 && servingG < 2000 ? servingG : 100,
      portionLabel: product.serving_size ?? null,
    })
    .returning();

  return inserted as ResolvedFood;
}
