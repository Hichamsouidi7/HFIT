import { NextResponse } from "next/server";
import { eq, not } from "drizzle-orm";
import { db } from "@/db";
import { shoppingItems } from "@/db/schema";

/** Ticks an item off the shopping list. */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const [updated] = await db
    .update(shoppingItems)
    .set({ checked: not(shoppingItems.checked) })
    .where(eq(shoppingItems.id, itemId))
    .returning({ checked: shoppingItems.checked });

  return NextResponse.json({ ok: true, checked: updated?.checked ?? false });
}
