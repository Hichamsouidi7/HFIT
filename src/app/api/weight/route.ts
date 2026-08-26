import { NextResponse } from "next/server";
import { todayISO } from "@/lib/day";
import { saveWeighIn } from "@/lib/queries";

export async function POST(request: Request) {
  const { weightKg, day } = (await request.json()) as { weightKg?: number; day?: string };
  const value = Number(weightKg);

  if (!Number.isFinite(value) || value < 30 || value > 400) {
    return NextResponse.json({ error: "Poids invalide." }, { status: 400 });
  }

  await saveWeighIn(day ?? todayISO(), Math.round(value * 10) / 10);
  return NextResponse.json({ ok: true });
}
