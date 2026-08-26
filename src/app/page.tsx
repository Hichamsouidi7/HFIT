import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs, weighIns } from "@/db/schema";
import { BottomNav } from "@/components/BottomNav";
import { MacroBar } from "@/components/MacroBar";
import { CalorieRing } from "@/components/Ring";
import { QuickActions } from "@/components/QuickActions";
import { StatCard, StepsSparkline } from "@/components/StatCard";
import { StepsCard, WaterCard, WeightCard, WorkoutCard } from "@/components/DayCards";
import { CHALLENGE, isoWeekday } from "@/content/challenge-21";
import { sessionForWeekday } from "@/content/program";
import { addDays, formatDayFR, todayISO } from "@/lib/day";
import { REFEED_EXTRA_CARBS_G, dayScore } from "@/lib/nutrition";
import { getDayTotals, getDayView, getProfile, isWorkoutDone } from "@/lib/queries";

// Everything here is per-request and user-specific; caching it would show him
// yesterday's numbers.
export const dynamic = "force-dynamic";

/** The headline. Reacts to the day rather than being a fixed slogan. */
function headline(dayNumber: number | null, scoreYesterday: number | null): string {
  if (dayNumber === 1) return "On attaque fort.";
  if (dayNumber && dayNumber >= CHALLENGE.durationDays) return "Dernier jour. Termine-le.";
  if (scoreYesterday !== null && scoreYesterday >= 85) return "Hier était propre. On enchaîne.";
  if (scoreYesterday !== null && scoreYesterday < 50) return "Journée neuve. On repart.";
  return "On lâche rien.";
}

export default async function TodayPage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  const day = todayISO();
  const view = await getDayView(day);
  if (!view) redirect("/bienvenue");

  const { log, totals, budget, ctx, currentWeight } = view;

  const [latestWeighIn] = await db
    .select()
    .from(weighIns)
    .orderBy(desc(weighIns.day))
    .limit(1);

  // Last 10 days of steps, for the sparkline and yesterday's score.
  const recentLogs = await db
    .select()
    .from(dailyLogs)
    .where(gte(dailyLogs.day, addDays(day, -9)))
    .orderBy(dailyLogs.day);

  const workoutDone = await isWorkoutDone(day);
  const session = sessionForWeekday(isoWeekday(day));

  const trendKg = latestWeighIn?.trendKg ?? currentWeight;
  const loggedToday = latestWeighIn?.day === day;

  const score = dayScore({
    steps: log.steps,
    stepsGoal: log.stepsGoal,
    proteinG: totals.proteinG,
    proteinGoalG: log.proteinGoalG,
    kcal: totals.kcal,
    kcalGoal: budget.budgetKcal,
    workoutDone,
    workoutPlanned: ctx.workoutPlanned,
    waterMl: log.waterMl,
    waterGoalMl: profileRow.waterGoalMl,
  });

  const yesterday = recentLogs.find((l) => l.day === addDays(day, -1));
  const yesterdayTotals = yesterday ? await getDayTotals(yesterday.day) : null;
  const scoreYesterday =
    yesterday && yesterdayTotals
      ? dayScore({
          steps: yesterday.steps,
          stepsGoal: yesterday.stepsGoal,
          proteinG: yesterdayTotals.proteinG,
          proteinGoalG: yesterday.proteinGoalG,
          kcal: yesterdayTotals.kcal,
          kcalGoal: yesterday.kcalGoal,
          workoutDone: await isWorkoutDone(yesterday.day),
          workoutPlanned: false,
          waterMl: yesterday.waterMl,
          waterGoalMl: profileRow.waterGoalMl,
        }).total
      : null;

  const stepsHistory = recentLogs.map((l) => l.steps);
  const proteinPct = log.proteinGoalG > 0 ? totals.proteinG / log.proteinGoalG : 0;

  return (
    <>
      <main className="mx-auto max-w-md px-5 pt-9">
        <header className="animate-rise">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-medium text-muted">{formatDayFR(day)}</p>
            {ctx.dayNumber && (
              <Link
                href="/progres/defi"
                className="rounded-full bg-ink px-2.5 py-0.5 text-[10px] font-bold text-white"
              >
                J{ctx.dayNumber}/{CHALLENGE.durationDays}
              </Link>
            )}
          </div>
          <h1 className="display mt-2 text-[2.55rem]">{headline(ctx.dayNumber, scoreYesterday)}</h1>
        </header>

        {ctx.refeed && (
          <p className="mt-5 rounded-2xl bg-accent-soft px-4 py-3 text-[12px] leading-relaxed text-accent">
            <strong className="font-semibold">Jour de recharge.</strong> +{REFEED_EXTRA_CARBS_G} g de
            glucides aujourd&apos;hui. Ce n&apos;est pas un écart, c&apos;est prévu.
          </p>
        )}

        {/* Hero: the one number that decides the next meal. */}
        <section className="card animate-rise mt-6 flex flex-col items-center px-5 py-7">
          <CalorieRing value={totals.kcal} goal={budget.budgetKcal} />

          {budget.earnedKcal > 0 && (
            <p className="mt-4 rounded-full bg-accent-soft px-3.5 py-1.5 text-[12px] font-semibold text-accent">
              +{budget.earnedKcal} kcal gagnées en marchant
            </p>
          )}

          <Link
            href="/manger"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 font-semibold text-white transition active:scale-[0.98]"
          >
            <span className="text-lg leading-none">+</span> Ajouter un repas
          </Link>
        </section>

        <div className="mt-6">
          <QuickActions />
        </div>

        <h2 className="display mt-9 text-[1.35rem]">Résumé du jour</h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard
            label="Pas"
            value={log.steps.toLocaleString("fr-FR")}
            sub={`objectif ${log.stepsGoal.toLocaleString("fr-FR")}`}
          >
            <StepsSparkline values={stepsHistory} />
          </StatCard>

          <StatCard
            label="Protéines"
            value={String(totals.proteinG)}
            unit="g"
            sub={`sur ${log.proteinGoalG} g`}
            progress={proteinPct}
          />

          <StatCard
            label="Score du jour"
            value={String(score.total)}
            unit="/100"
            sub="pas · protéines · kcal"
            progress={score.total / 100}
            ringColor="var(--color-ink)"
            href="/progres/defi"
          />

          <StatCard
            label="Tendance"
            value={trendKg.toFixed(1)}
            unit="kg"
            sub={`départ ${profileRow.startWeightKg.toFixed(1)} kg`}
            href="/progres"
          />
        </div>

        <h2 className="display mt-9 text-[1.35rem]">Macros</h2>

        <section className="card mt-4 space-y-4 p-5">
          <MacroBar
            label="Protéines"
            value={totals.proteinG}
            goal={log.proteinGoalG}
            color="protein"
            hero
          />
          <MacroBar label="Lipides" value={totals.fatG} goal={log.fatGoalG} color="fat" />
          <MacroBar label="Glucides" value={totals.carbsG} goal={log.carbsGoalG} color="carbs" />
        </section>

        <div className="mt-4 space-y-3">
          <WorkoutCard
            planned={ctx.workoutPlanned}
            done={workoutDone}
            title={session?.title ?? "Séance"}
          />

          <StepsCard
            steps={log.steps}
            goal={log.stepsGoal}
            earnedKcal={budget.earnedKcal}
            synced={Boolean(log.stepsSyncedAt)}
          />

          <WeightCard
            latestWeight={latestWeighIn?.weightKg ?? currentWeight}
            trendWeight={trendKg}
            startWeight={profileRow.startWeightKg}
            targetWeight={profileRow.targetWeightKg}
            loggedToday={loggedToday}
          />

          <WaterCard waterMl={log.waterMl} goalMl={profileRow.waterGoalMl} />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
