import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { workoutKcal } from "@/lib/nutrition";
import { getCurrentWeight, getProfile } from "@/lib/queries";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const workoutId = Number(id);
  const body = (await request.json().catch(() => ({}))) as {
    durationMinutes?: number;
    rating?: number;
    note?: string;
  };

  if (!Number.isInteger(workoutId)) {
    return NextResponse.json({ error: "Séance invalide." }, { status: 400 });
  }

  const profileRow = await getProfile();
  const weightKg = profileRow ? await getCurrentWeight(profileRow) : 80;
  const minutes = Math.max(1, Math.min(240, Math.round(Number(body.durationMinutes) || 55)));

  await db
    .update(workouts)
    .set({
      durationMinutes: minutes,
      kcal: workoutKcal(minutes, weightKg),
      rating: Number.isFinite(Number(body.rating)) ? Math.round(Number(body.rating)) : null,
      note: body.note?.trim() || null,
      completedAt: new Date(),
    })
    .where(eq(workouts.id, workoutId));

  return NextResponse.json({ ok: true });
}
