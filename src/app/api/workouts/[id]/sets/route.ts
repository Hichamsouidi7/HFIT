import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, workoutSets } from "@/db/schema";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const workoutId = Number(id);
  const body = (await request.json()) as {
    slug?: string;
    setNumber?: number;
    reps?: number;
    weightKg?: number | null;
    rpe?: number | null;
  };

  if (!Number.isInteger(workoutId)) {
    return NextResponse.json({ error: "Séance invalide." }, { status: 400 });
  }

  const reps = Number(body.reps);
  if (!Number.isFinite(reps) || reps <= 0 || reps > 500) {
    return NextResponse.json({ error: "Nombre de répétitions invalide." }, { status: 400 });
  }

  const [exercise] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(eq(exercises.slug, body.slug ?? ""))
    .limit(1);

  if (!exercise) {
    return NextResponse.json({ error: "Exercice inconnu." }, { status: 404 });
  }

  const weight = Number(body.weightKg);
  const rpe = Number(body.rpe);

  const [set] = await db
    .insert(workoutSets)
    .values({
      workoutId,
      exerciseId: exercise.id,
      setNumber: Math.max(1, Math.round(Number(body.setNumber) || 1)),
      reps: Math.round(reps),
      weightKg: Number.isFinite(weight) && weight >= 0 ? weight : null,
      rpe: Number.isFinite(rpe) && rpe > 0 && rpe <= 10 ? rpe : null,
    })
    .returning();

  return NextResponse.json({ ok: true, set });
}
