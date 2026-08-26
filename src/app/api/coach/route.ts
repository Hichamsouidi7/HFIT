import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { coachReports, profile } from "@/db/schema";
import { GeminiUnavailable, generateJSON, isConfigured } from "@/lib/gemini";
import { autopilot } from "@/lib/nutrition";
import { addDays, daysBetween, formatDayFR, todayISO, weekStart } from "@/lib/day";
import {
  getChallengeDays,
  getProfile,
  getWeighIns,
  getWorkoutHistory,
} from "@/lib/queries";

/**
 * The weekly review.
 *
 * The split matters: every number here is computed in code (trend loss,
 * adherence, the auto-pilot correction), and the model only turns those facts
 * into something readable and picks what to prioritise. Asking a model to do
 * the arithmetic would put invented numbers in front of decisions.
 */

export const maxDuration = 45;

const SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string" },
    analysis: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          why: { type: "string" },
        },
        required: ["title", "why"],
      },
    },
  },
  required: ["verdict", "analysis", "actions"],
} as const;

const SYSTEM = `Tu es le coach d'Hicham : direct, factuel, jamais moralisateur.

Cadre :
- Il fait un déficit agressif de façon assumée. Ne le lui reproche pas, ne lui fais pas la leçon, ne lui suggère pas de « ralentir pour sa santé ». Ton rôle est de rendre ce déficit tenable et efficace, pas de le remettre en question.
- Ne fabrique JAMAIS de chiffre : utilise uniquement ceux qu'on te donne.
- "verdict" : une phrase courte et franche sur la semaine.
- "analysis" : 3 à 5 phrases. Ce qui a marché, ce qui a coincé, et pourquoi. Sois concret, cite les chiffres fournis.
- "actions" : exactement 3 priorités pour la semaine qui vient, chacune concrète et vérifiable ("passer à 15 000 pas", pas "faire plus attention"). "why" en une phrase.
- Tout en français, tutoiement.`;

export async function GET() {
  const week = weekStart(todayISO());
  const [existing] = await db
    .select()
    .from(coachReports)
    .where(eq(coachReports.weekStart, week))
    .orderBy(desc(coachReports.createdAt))
    .limit(1);

  return NextResponse.json({ report: existing ?? null });
}

export async function POST() {
  const profileRow = await getProfile();
  if (!profileRow) {
    return NextResponse.json({ error: "Profil manquant." }, { status: 400 });
  }

  const week = weekStart(todayISO());

  // One report per week, cached: the analysis is expensive and does not change
  // meaningfully between two loads of the same page.
  const [cached] = await db
    .select()
    .from(coachReports)
    .where(eq(coachReports.weekStart, week))
    .limit(1);
  if (cached) return NextResponse.json({ report: cached, cached: true });

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "L'IA n'est pas configurée : ajoute GEMINI_API_KEY dans les variables Vercel." },
      { status: 503 },
    );
  }

  const [weighIns, workouts, { days }] = await Promise.all([
    getWeighIns(),
    getWorkoutHistory(20),
    getChallengeDays(),
  ]);

  const since = addDays(todayISO(), -7);
  const recent = days.filter((d) => d.day >= since && d.score !== null);

  if (recent.length < 3) {
    return NextResponse.json(
      { error: "Pas encore assez de données. Reviens après 3 jours enregistrés." },
      { status: 400 },
    );
  }

  const first = weighIns[0];
  const last = weighIns[weighIns.length - 1];
  const elapsed = first && last ? daysBetween(first.day, last.day) : 0;

  const suggestion =
    first && last && elapsed >= 5
      ? autopilot(first.trendKg, last.trendKg, elapsed, 1.0)
      : null;

  const avg = (pick: (d: (typeof recent)[number]) => number) =>
    Math.round(recent.reduce((sum, d) => sum + pick(d), 0) / recent.length);

  const facts = {
    jours: recent.length,
    scoreMoyen: avg((d) => d.score ?? 0),
    pasMoyens: avg((d) => d.steps),
    objectifPas: recent[recent.length - 1]?.stepsGoal ?? 0,
    proteinesMoyennes: avg((d) => d.proteinG),
    objectifProteines: recent[recent.length - 1]?.proteinGoalG ?? 0,
    caloriesMoyennes: avg((d) => d.kcal),
    objectifCalories: recent[recent.length - 1]?.kcalGoal ?? 0,
    seancesFaites: recent.filter((d) => d.workoutDone).length,
    seancesPrevues: recent.filter((d) => d.workoutPlanned).length,
    joursSansJournal: recent.filter((d) => d.kcal === 0).length,
  };

  const prompt = `Semaine du ${formatDayFR(week)}.

Poids :
- Départ du programme : ${profileRow.startWeightKg.toFixed(1)} kg
- Tendance actuelle : ${(last?.trendKg ?? profileRow.startWeightKg).toFixed(1)} kg
- Objectif final : ${profileRow.targetWeightKg.toFixed(1)} kg
${suggestion ? `- Perte réelle mesurée : ${suggestion.actualWeeklyLossKg.toFixed(2)} kg/semaine (visé ${suggestion.targetWeeklyLossKg.toFixed(1)})` : "- Pas encore assez de pesées pour mesurer une pente fiable."}

Adhérence sur les ${facts.jours} derniers jours enregistrés :
- Score moyen : ${facts.scoreMoyen}/100
- Pas : ${facts.pasMoyens} en moyenne, objectif ${facts.objectifPas}
- Protéines : ${facts.proteinesMoyennes} g en moyenne, objectif ${facts.objectifProteines} g
- Calories : ${facts.caloriesMoyennes} en moyenne, budget ${facts.objectifCalories}
- Séances : ${facts.seancesFaites} faites sur ${facts.seancesPrevues} prévues
- Journées sans rien enregistrer : ${facts.joursSansJournal}
- Séances totales enregistrées depuis le début : ${workouts.length}

${
  suggestion && suggestion.verdict !== "on_track"
    ? `Correction calculée par l'app (à reprendre telle quelle dans tes priorités si elle est pertinente) : ${
        suggestion.stepsAdjustment !== 0
          ? `${suggestion.stepsAdjustment > 0 ? "+" : ""}${suggestion.stepsAdjustment} pas/jour`
          : ""
      }${suggestion.stepsAdjustment !== 0 && suggestion.kcalAdjustment !== 0 ? " et " : ""}${
        suggestion.kcalAdjustment !== 0
          ? `${suggestion.kcalAdjustment > 0 ? "+" : ""}${suggestion.kcalAdjustment} kcal/jour`
          : ""
      }.`
    : "L'app ne propose aucune correction : la pente est conforme au plan."
}

Écris le bilan.`;

  try {
    const result = await generateJSON<{
      verdict: string;
      analysis: string;
      actions: { title: string; why: string }[];
    }>({
      prompt,
      schema: SCHEMA as unknown as Record<string, unknown>,
      systemInstruction: SYSTEM,
      temperature: 0.6,
    });

    const [report] = await db
      .insert(coachReports)
      .values({
        weekStart: week,
        content: `${result.verdict}\n\n${result.analysis}`,
        actions: result.actions.slice(0, 3),
        adjustment: suggestion ?? null,
      })
      .returning();

    return NextResponse.json({ report, cached: false });
  } catch (error) {
    if (error instanceof GeminiUnavailable) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Bilan impossible à générer." }, { status: 500 });
  }
}

/** Applies the auto-pilot's correction to the stored goals. */
export async function PATCH(request: Request) {
  const body = (await request.json()) as { kcalAdjustment?: number; stepsAdjustment?: number };
  const profileRow = await getProfile();
  if (!profileRow) return NextResponse.json({ error: "Profil manquant." }, { status: 400 });

  const steps = Math.round(Number(body.stepsAdjustment) || 0);
  // Bounded here as well as in the engine: this endpoint is reachable directly,
  // and a bad value would rewrite the plan for every day that follows.
  if (Math.abs(steps) > 3000) {
    return NextResponse.json({ error: "Ajustement hors limites." }, { status: 400 });
  }

  const nextSteps = Math.max(4000, Math.min(30_000, profileRow.stepsGoal + steps));

  await db
    .update(profile)
    .set({ stepsGoal: nextSteps, updatedAt: new Date() })
    .where(eq(profile.id, 1));

  return NextResponse.json({ ok: true, stepsGoal: nextSteps });
}
