import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { challenges, profile } from "@/db/schema";
import { addDays, todayISO } from "@/lib/day";
import { CHALLENGE, stepsGoalForDayNumber } from "@/content/challenge-21";
import { getProfile, saveWeighIn } from "@/lib/queries";

export async function GET() {
  return NextResponse.json({ profile: await getProfile() });
}

/**
 * Partial update from the settings screen.
 *
 * Separate from POST because POST is the onboarding path: it also records a
 * first weigh-in and starts a challenge, neither of which should happen because
 * someone corrected their height.
 */
export async function PATCH(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const current = await getProfile();
  if (!current) return NextResponse.json({ error: "Profil manquant." }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  const numeric: [string, number, number][] = [
    ["age", 10, 120],
    ["heightCm", 100, 250],
    ["targetWeightKg", 30, 400],
    ["stepsGoal", 2000, 40_000],
    ["waterGoalMl", 500, 8000],
  ];

  for (const [key, min, max] of numeric) {
    if (body[key] === undefined) continue;
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < min || value > max) {
      return NextResponse.json({ error: `Valeur invalide pour ${key}.` }, { status: 400 });
    }
    updates[key] = key === "stepsGoal" || key === "waterGoalMl" || key === "age"
      ? Math.round(value)
      : value;
  }

  if (body.aggressiveness !== undefined) {
    const level = String(body.aggressiveness);
    if (!["moderate", "aggressive", "extreme"].includes(level)) {
      return NextResponse.json({ error: "Intensité invalide." }, { status: 400 });
    }
    updates.aggressiveness = level;
  }

  if (body.bodyFatPct !== undefined) {
    const value = body.bodyFatPct === null || body.bodyFatPct === "" ? null : Number(body.bodyFatPct);
    if (value !== null && (!Number.isFinite(value) || value <= 0 || value >= 70)) {
      return NextResponse.json({ error: "Masse grasse invalide." }, { status: 400 });
    }
    updates.bodyFatPct = value;
  }

  for (const key of ["allergies", "dislikedFoods", "dietaryPrefs"] as const) {
    if (body[key] !== undefined) updates[key] = String(body[key]).trim() || null;
  }

  await db.update(profile).set(updates).where(eq(profile.id, 1));

  return NextResponse.json({ ok: true, profile: await getProfile() });
}

interface Body {
  sex?: "male" | "female";
  age?: number;
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
  bodyFatPct?: number | null;
  aggressiveness?: "moderate" | "aggressive" | "extreme";
  startChallenge?: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  const age = Number(body.age);
  const heightCm = Number(body.heightCm);
  const weightKg = Number(body.weightKg);
  const targetWeightKg = Number(body.targetWeightKg);

  if (!(age > 0 && age < 120)) {
    return NextResponse.json({ error: "Âge invalide." }, { status: 400 });
  }
  if (!(heightCm > 100 && heightCm < 250)) {
    return NextResponse.json({ error: "Taille invalide." }, { status: 400 });
  }
  if (!(weightKg > 30 && weightKg < 400)) {
    return NextResponse.json({ error: "Poids invalide." }, { status: 400 });
  }
  if (!(targetWeightKg > 30 && targetWeightKg < 400)) {
    return NextResponse.json({ error: "Poids visé invalide." }, { status: 400 });
  }

  const today = todayISO();
  const values = {
    id: 1,
    sex: body.sex === "female" ? "female" : "male",
    age,
    heightCm,
    startWeightKg: weightKg,
    targetWeightKg,
    bodyFatPct: body.bodyFatPct ?? null,
    aggressiveness: body.aggressiveness ?? "extreme",
    stepsGoal: stepsGoalForDayNumber(1),
    waterGoalMl: CHALLENGE.waterGoalMl,
    updatedAt: new Date(),
  };

  await db
    .insert(profile)
    .values(values)
    .onConflictDoUpdate({ target: profile.id, set: values });

  // The starting weight is also the first data point of the trend line.
  await saveWeighIn(today, weightKg, "onboarding");

  if (body.startChallenge) {
    const existing = await db
      .select({ id: challenges.id })
      .from(challenges)
      .where(eq(challenges.status, "active"))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(challenges).values({
        name: CHALLENGE.name,
        startDay: today,
        endDay: addDays(today, CHALLENGE.durationDays - 1),
        startWeightKg: weightKg,
        rules: {
          stepsRamp: CHALLENGE.stepsRamp,
          workoutWeekdays: CHALLENGE.workoutWeekdays,
          refeedWeekday: CHALLENGE.refeedWeekday,
          waterGoalMl: CHALLENGE.waterGoalMl,
        },
        status: "active",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
