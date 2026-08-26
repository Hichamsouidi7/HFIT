import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workoutSets } from "@/db/schema";

export async function DELETE(_request: Request, ctx: { params: Promise<{ setId: string }> }) {
  const { setId } = await ctx.params;
  const id = Number(setId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }
  await db.delete(workoutSets).where(eq(workoutSets.id, id));
  return NextResponse.json({ ok: true });
}
