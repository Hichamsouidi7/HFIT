import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs } from "@/db/schema";
import { todayISO } from "@/lib/day";
import { getOrCreateDailyLog } from "@/lib/queries";

export async function POST(request: Request) {
  const { steps, day } = (await request.json()) as { steps?: number; day?: string };
  const value = Math.round(Number(steps));

  if (!Number.isFinite(value) || value < 0 || value > 200_000) {
    return NextResponse.json({ error: "Nombre de pas invalide." }, { status: 400 });
  }

  const target = day ?? todayISO();
  await getOrCreateDailyLog(target);
  await db.update(dailyLogs).set({ steps: value }).where(eq(dailyLogs.day, target));

  return NextResponse.json({ ok: true, steps: value });
}
