import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs } from "@/db/schema";
import { todayISO } from "@/lib/day";
import { getOrCreateDailyLog, saveWeighIn } from "@/lib/queries";

/**
 * Webhook for the iPhone Shortcut that pushes Apple Health data.
 *
 * Apple does not let a web app read HealthKit - that is native-only, and would
 * mean an Apple Developer account. The Shortcuts app can read Health and POST,
 * so a single shortcut on a daily automation covers it for free.
 *
 * This route sits outside the password wall (see middleware) because Shortcuts
 * cannot carry the session cookie; it authenticates with its own secret token
 * instead.
 */
function authorized(request: Request): boolean {
  const expected = process.env.HEALTH_SYNC_TOKEN;
  if (!expected) return false;

  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("token");
  const fromHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return fromQuery === expected || fromHeader === expected;
}

interface Body {
  steps?: number | string;
  weightKg?: number | string;
  sleepHours?: number | string;
  day?: string;
}

/** Shortcuts sends numbers as text often enough that it is worth coercing. */
function num(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Jeton invalide" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const day = body.day ?? todayISO();
  const applied: string[] = [];

  await getOrCreateDailyLog(day);

  const steps = num(body.steps);
  if (steps !== null && steps >= 0 && steps <= 200_000) {
    await db
      .update(dailyLogs)
      .set({ steps: Math.round(steps), stepsSyncedAt: new Date() })
      .where(eq(dailyLogs.day, day));
    applied.push(`pas: ${Math.round(steps)}`);
  }

  const sleepHours = num(body.sleepHours);
  if (sleepHours !== null && sleepHours > 0 && sleepHours < 24) {
    await db
      .update(dailyLogs)
      .set({ sleepHours: Math.round(sleepHours * 10) / 10 })
      .where(eq(dailyLogs.day, day));
    applied.push(`sommeil: ${sleepHours.toFixed(1)} h`);
  }

  const weightKg = num(body.weightKg);
  if (weightKg !== null && weightKg > 30 && weightKg < 400) {
    await saveWeighIn(day, Math.round(weightKg * 10) / 10, "sante");
    applied.push(`poids: ${weightKg.toFixed(1)} kg`);
  }

  // Plain-text-friendly reply: this is what the Shortcut shows in its notification.
  return NextResponse.json({
    ok: true,
    day,
    applied,
    message: applied.length > 0 ? `HFit synchronisé — ${applied.join(", ")}` : "Rien à synchroniser",
  });
}
