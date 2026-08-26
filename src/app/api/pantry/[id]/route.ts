import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pantry } from "@/db/schema";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  await db.delete(pantry).where(eq(pantry.id, itemId));
  return NextResponse.json({ ok: true });
}
