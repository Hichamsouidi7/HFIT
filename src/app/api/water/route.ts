import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs } from "@/db/schema";
import { todayISO } from "@/lib/day";
import { getOrCreateDailyLog } from "@/lib/queries";

export async function POST(request: Request) {
  const { waterMl, addMl } = (await request.json()) as { waterMl?: number; addMl?: number };
  const day = todayISO();
  const log = await getOrCreateDailyLog(day);

  // Two ways in: tapping a glass sets an absolute mark, the quick-action adds.
  const next =
    waterMl !== undefined ? Math.round(Number(waterMl)) : log.waterMl + Math.round(Number(addMl));

  if (!Number.isFinite(next) || next < 0 || next > 20_000) {
    return NextResponse.json({ error: "Quantité invalide." }, { status: 400 });
  }

  await db.update(dailyLogs).set({ waterMl: next }).where(eq(dailyLogs.day, day));
  return NextResponse.json({ ok: true, waterMl: next });
}
