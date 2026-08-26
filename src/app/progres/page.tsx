import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { StatCard } from "@/components/StatCard";
import { WeightChart } from "@/components/WeightChart";
import { CHALLENGE } from "@/content/challenge-21";
import { daysBetween, todayISO } from "@/lib/day";
import { autopilot } from "@/lib/nutrition";
import { getActiveChallenge, getProfile, getWeighIns } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  const day = todayISO();
  const weighIns = await getWeighIns();
  const challenge = await getActiveChallenge();

  const first = weighIns[0];
  const last = weighIns[weighIns.length - 1];
  const trendNow = last?.trendKg ?? profileRow.startWeightKg;
  const lostTrend = profileRow.startWeightKg - trendNow;
  const toGo = trendNow - profileRow.targetWeightKg;

  const dayNumber = challenge ? daysBetween(challenge.startDay, day) + 1 : null;

  // The auto-pilot only says anything meaningful once the trend has had time to
  // settle; before a week it would just be reacting to water.
  const elapsed = first && last ? daysBetween(first.day, last.day) : 0;
  const suggestion =
    first && last && elapsed >= 7
      ? autopilot(first.trendKg, last.trendKg, elapsed, 1.0)
      : null;

  return (
    <>
      <main className="mx-auto max-w-md px-5 pt-10">
        <h1 className="display text-[2.4rem]">Progrès</h1>

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
            sub={dayNumber ? "en cours" : "aucun défi actif"}
            progress={dayNumber ? Math.min(1, dayNumber / CHALLENGE.durationDays) : 0}
            ringColor="var(--color-ink)"
          />
          <StatCard
            label="Pesées"
            value={String(weighIns.length)}
            sub="enregistrées"
          />
        </div>

        <h2 className="display mt-9 text-[1.4rem]">Poids</h2>
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

        {suggestion && (
          <>
            <h2 className="display mt-9 text-[1.4rem]">Auto-pilote</h2>
            <section className="card mt-4 p-5">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                Tendance réelle :{" "}
                <strong className="tnum">
                  {suggestion.actualWeeklyLossKg.toFixed(2)} kg / semaine
                </strong>{" "}
                (visé {suggestion.targetWeeklyLossKg.toFixed(1)}).
              </p>

              <p className="mt-3 text-[14px] font-semibold">
                {suggestion.verdict === "on_track" && "Tu es dans les clous. On ne touche à rien."}
                {suggestion.verdict === "too_slow" && "Ça avance trop lentement."}
                {suggestion.verdict === "too_fast" && "Ça descend plus vite que prévu."}
              </p>

              {suggestion.verdict !== "on_track" && (
                <ul className="mt-2.5 space-y-1.5 text-[13px] text-ink-soft">
                  {suggestion.stepsAdjustment !== 0 && (
                    <li>
                      • {suggestion.stepsAdjustment > 0 ? "+" : ""}
                      {suggestion.stepsAdjustment.toLocaleString("fr-FR")} pas par jour
                    </li>
                  )}
                  {suggestion.kcalAdjustment !== 0 && (
                    <li>
                      • {suggestion.kcalAdjustment > 0 ? "+" : ""}
                      {suggestion.kcalAdjustment} kcal par jour
                    </li>
                  )}
                </ul>
              )}

              <p className="mt-3 text-[11px] leading-relaxed text-faint">
                L&apos;application automatique de ces ajustements arrive à l&apos;étape suivante.
                Pour l&apos;instant c&apos;est une lecture, pas une action.
              </p>
            </section>
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}
