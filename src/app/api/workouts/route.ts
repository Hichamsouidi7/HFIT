import { NextResponse } from "next/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { todayISO } from "@/lib/day";
import { getOpenWorkout } from "@/lib/queries";

/** Starts a session, or hands back the one already open for the day. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    templateId?: number;
    day?: string;
  };

  const day = body.day ?? todayISO();

  const open = await getOpenWorkout(day);
  if (open) return NextResponse.json({ ok: true, workout: open, resumed: true });

  const [workout] = await db
    .insert(workouts)
    .values({ day, name: body.name ?? "Séance", templateId: body.templateId ?? null })
    .returning();

  return NextResponse.json({ ok: true, workout, resumed: false });
}
