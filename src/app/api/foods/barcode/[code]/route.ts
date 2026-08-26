import { NextResponse } from "next/server";
import { findByBarcode } from "@/lib/openfoodfacts";

export async function GET(_request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const food = await findByBarcode(code);

  if (!food) {
    return NextResponse.json(
      { error: "Produit introuvable dans Open Food Facts. Tu peux le créer à la main." },
      { status: 404 },
    );
  }

  return NextResponse.json({ food });
}
