import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState, PageHeader } from "@/components/ui";
import { CHALLENGE } from "@/content/challenge-21";
import { formatDayFR } from "@/lib/day";
import { getChallengeDays, getProfile, getWeighIns } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Colour ramp for a day's score. Grey means "not scored", never "zero". */
function scoreStyle(score: number | null, isFuture: boolean): string {
  if (isFuture) return "bg-white/50 text-faint";
  if (score === null) return "bg-sunken text-faint";
  if (score >= 85) return "bg-accent text-white";
  if (score >= 65) return "bg-accent/55 text-white";
  if (score >= 40) return "bg-accent/25 text-accent";
  return "bg-danger/15 text-danger";
}

export default async function ChallengePage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  const { challenge, days } = await getChallengeDays();

  if (!challenge) {
    return (
      <>
        <main className="mx-auto max-w-md px-5">
          <PageHeader title="Défi" back="/progres" />
          <div className="mt-6">
            <EmptyState
              title="Aucun défi en cours"
              body="Un défi de 21 jours se lance depuis l'installation, ou depuis les réglages."
            />
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  const scored = days.filter((d) => d.score !== null);
  const average =
    scored.length > 0
      ? Math.round(scored.reduce((sum, d) => sum + (d.score ?? 0), 0) / scored.length)
      : null;

  const weighIns = await getWeighIns();
  const startTrend = weighIns[0]?.trendKg ?? challenge.startWeightKg;
  const currentTrend = weighIns[weighIns.length - 1]?.trendKg ?? startTrend;
  const lost = challenge.startWeightKg - currentTrend;

  const perfectDays = scored.filter((d) => (d.score ?? 0) >= 85).length;
  const totalSteps = days.reduce((n, d) => n + d.steps, 0);
  const workouts = days.filter((d) => d.workoutDone).length;
  const currentDayNumber = days.find((d) => d.isToday)?.dayNumber ?? scored.length;

  return (
    <>
      <main className="mx-auto max-w-md px-5">
        <PageHeader
          title={CHALLENGE.name}
          subtitle={`Jour ${Math.min(currentDayNumber, CHALLENGE.durationDays)} sur ${CHALLENGE.durationDays}`}
          back="/progres"
        />

        <section className="card mt-6 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Perdu (tendance)"
              value={lost > 0 ? `−${lost.toFixed(1)}` : lost.toFixed(1)}
              unit="kg"
              accent
            />
            <Stat label="Score moyen" value={average !== null ? String(average) : "—"} unit="/100" />
            <Stat label="Séances faites" value={String(workouts)} />
            <Stat
              label="Pas cumulés"
              value={totalSteps.toLocaleString("fr-FR")}
            />
          </div>

          {perfectDays > 0 && (
            <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-[12.5px] leading-relaxed text-accent">
              <strong className="font-semibold">
                {perfectDays} journée{perfectDays > 1 ? "s" : ""} au-dessus de 85
              </strong>
              . C&apos;est cette régularité qui fait le résultat, pas les jours parfaits isolés.
            </p>
          )}
        </section>

        <h2 className="display mt-9 text-[1.35rem]">Les 21 jours</h2>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {days.map((d) => {
            const isFuture = !d.isPast && !d.isToday;
            return (
              <div
                key={d.day}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl ${scoreStyle(d.score, isFuture)} ${
                  d.isToday ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""
                }`}
                title={`${formatDayFR(d.day)} — ${d.score !== null ? `${d.score}/100` : "pas de données"}`}
              >
                <span className="tnum text-[13px] font-bold leading-none">{d.dayNumber}</span>
                {d.score !== null && (
                  <span className="tnum mt-0.5 text-[9px] leading-none opacity-80">{d.score}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[10.5px] text-muted">
          <Legend className="bg-accent" label="85+" />
          <Legend className="bg-accent/55" label="65-84" />
          <Legend className="bg-accent/25" label="40-64" />
          <Legend className="bg-danger/20" label="sous 40" />
          <Legend className="bg-sunken" label="pas de données" />
        </div>

        <h2 className="display mt-9 text-[1.35rem]">Jour par jour</h2>

        <ul className="mt-4 space-y-2">
          {[...days]
            .filter((d) => d.isPast || d.isToday)
            .reverse()
            .map((d) => (
              <li key={d.day} className="card-solid p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13.5px] font-semibold">
                    Jour {d.dayNumber}
                    <span className="ml-2 font-normal text-muted">{formatDayFR(d.day)}</span>
                  </p>
                  {d.score !== null && (
                    <span className="tnum text-[15px] font-bold text-accent">{d.score}</span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted">
                  <span className="tnum">
                    {d.steps.toLocaleString("fr-FR")} / {d.stepsGoal.toLocaleString("fr-FR")} pas
                  </span>
                  <span className="tnum">
                    {d.proteinG} / {d.proteinGoalG} g de protéines
                  </span>
                  <span className="tnum">
                    {d.kcal} / {d.kcalGoal} kcal
                  </span>
                  {d.workoutPlanned && (
                    <span className={d.workoutDone ? "text-accent" : "text-faint"}>
                      {d.workoutDone ? "séance ✓" : "séance manquée"}
                    </span>
                  )}
                  {d.weightKg != null && <span className="tnum">{d.weightKg.toFixed(1)} kg</span>}
                </div>
              </li>
            ))}
        </ul>
      </main>
      <BottomNav />
    </>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-sunken px-4 py-3">
      <div className="flex items-baseline gap-1">
        <span className={`tnum text-[21px] font-bold ${accent ? "text-accent" : ""}`}>{value}</span>
        {unit && <span className="text-[11px] text-muted">{unit}</span>}
      </div>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded ${className}`} />
      {label}
    </span>
  );
}
