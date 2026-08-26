import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { foodEntries } from "@/db/schema";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const entryId = Number(id);

  if (!Number.isInteger(entryId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  await db.delete(foodEntries).where(eq(foodEntries.id, entryId));
  return NextResponse.json({ ok: true });
}
