import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { progressPhotos } from "@/db/schema";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }
  await db.delete(progressPhotos).where(eq(progressPhotos.id, photoId));
  return NextResponse.json({ ok: true });
}
