import { NextResponse } from "next/server";
import { eq, not } from "drizzle-orm";
import { db } from "@/db";
import { foods } from "@/db/schema";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const foodId = Number(id);

  if (!Number.isInteger(foodId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const [updated] = await db
    .update(foods)
    .set({ isFavorite: not(foods.isFavorite) })
    .where(eq(foods.id, foodId))
    .returning({ isFavorite: foods.isFavorite });

  return NextResponse.json({ ok: true, isFavorite: updated?.isFavorite ?? false });
}
