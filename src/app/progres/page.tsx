import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { coachReports, progressPhotos, workouts } from "@/db/schema";
import { BottomNav } from "@/components/BottomNav";
import { CoachReport } from "@/components/CoachReport";
import { StatCard } from "@/components/StatCard";
import { WeightChart } from "@/components/WeightChart";
import { CHALLENGE } from "@/content/challenge-21";
import { daysBetween, todayISO, weekStart } from "@/lib/day";
import { getActiveChallenge, getProfile, getWeighIns } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  const day = todayISO();
  const [weighIns, challenge] = await Promise.all([getWeighIns(), getActiveChallenge()]);

  const [[photoCount], [workoutCount], [report]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(progressPhotos),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(workouts)
      .where(sql`${workouts.completedAt} is not null`),
    db
      .select()
      .from(coachReports)
      .where(eq(coachReports.weekStart, weekStart(day)))
      .orderBy(desc(coachReports.createdAt))
      .limit(1),
  ]);

  const last = weighIns[weighIns.length - 1];
  const trendNow = last?.trendKg ?? profileRow.startWeightKg;
  const lostTrend = profileRow.startWeightKg - trendNow;
  const toGo = trendNow - profileRow.targetWeightKg;
  const dayNumber = challenge ? daysBetween(challenge.startDay, day) + 1 : null;

  return (
    <>
      <main className="mx-auto max-w-md px-5 pt-10">
        <h1 className="display text-[2.3rem]">Progrès</h1>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <StatCard
            label="Perdu (tendance)"
            value={lostTrend > 0 ? `−${lostTrend.toFixed(1)}` : lostTrend.toFixed(1)}
            unit="kg"
            sub={`depuis ${profileRow.startWeightKg.toFixed(1)} kg`}
          />
          <StatCard
            label="Reste à perdre"
            value={toGo.toFixed(1)}
            unit="kg"
            sub={`objectif ${profileRow.targetWeightKg.toFixed(1)} kg`}
          />
          <StatCard
            label="Défi"
            value={dayNumber ? `J${Math.min(dayNumber, CHALLENGE.durationDays)}` : "—"}
            unit={dayNumber ? `/${CHALLENGE.durationDays}` : undefined}
            sub={dayNumber ? "voir le détail" : "aucun défi actif"}
            progress={dayNumber ? Math.min(1, dayNumber / CHALLENGE.durationDays) : 0}
            ringColor="var(--color-ink)"
            href="/progres/defi"
          />
          <StatCard
            label="Photos"
            value={String(photoCount?.n ?? 0)}
            sub="avant / après"
            href="/progres/photos"
          />
        </div>

        <h2 className="display mt-9 text-[1.35rem]">Poids</h2>
        <div className="mt-4">
          <WeightChart
            points={weighIns.map((w) => ({
              day: w.day,
              weightKg: w.weightKg,
              trendKg: w.trendKg,
            }))}
            targetKg={profileRow.targetWeightKg}
          />
        </div>

        <h2 className="display mt-9 text-[1.35rem]">Le coach</h2>
        <div className="mt-4">
          <CoachReport
            initial={
              report
                ? {
                    id: report.id,
                    weekStart: report.weekStart,
                    content: report.content,
                    actions: report.actions as { title: string; why: string }[] | null,
                    adjustment: report.adjustment as never,
                  }
                : null
            }
          />
        </div>

        <h2 className="display mt-9 text-[1.35rem]">Le reste</h2>
        <div className="mt-4 space-y-2.5">
          <Row href="/progres/photos" title="Photos de progression" sub="Ce que la balance ne montre pas" />
          <Row href="/progres/defi" title="Défi 21 jours" sub="Le détail jour par jour" />
          <Row
            href="/bouger/exercices"
            title="Exercices"
            sub={`${workoutCount?.n ?? 0} séance${(workoutCount?.n ?? 0) > 1 ? "s" : ""} enregistrée${(workoutCount?.n ?? 0) > 1 ? "s" : ""}`}
          />
          <Row href="/reglages" title="Réglages" sub="Profil, objectifs, données" />
        </div>
      </main>
      <BottomNav />
    </>
  );
}

function Row({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="card-solid flex items-center justify-between gap-3 p-4 transition active:scale-[0.99]"
    >
      <div className="min-w-0">
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="truncate text-[11.5px] text-muted">{sub}</p>
      </div>
      <span className="shrink-0 text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
