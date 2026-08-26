import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { StepsCard } from "@/components/DayCards";
import { StartWorkout } from "@/components/StartWorkout";
import { CHALLENGE, isoWeekday } from "@/content/challenge-21";
import { SESSIONS, resolveSession, sessionForWeekday } from "@/content/program";
import { formatDayFR, todayISO } from "@/lib/day";
import {
  getDayView,
  getOpenWorkout,
  getProfile,
  getWorkoutHistory,
  isWorkoutDone,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const WEEKDAY_SHORT = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

export default async function MovePage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  const day = todayISO();
  const view = await getDayView(day);
  if (!view) redirect("/bienvenue");

  const { log, budget } = view;
  const weekday = isoWeekday(day);
  const session = sessionForWeekday(weekday);

  const [done, open, history] = await Promise.all([
    isWorkoutDone(day),
    getOpenWorkout(day),
    getWorkoutHistory(8),
  ]);

  return (
    <>
      <main className="mx-auto max-w-md px-5 pt-10">
        <h1 className="display text-[2.3rem]">Bouger</h1>
        <p className="mt-1.5 text-[13px] text-muted">{formatDayFR(day)}</p>

        <div className="mt-5">
          {!session ? (
            <section className="card p-6">
              <h2 className="text-[17px] font-bold">Repos aujourd&apos;hui</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                Pas de muscu prévue. Garde les pas : c&apos;est eux qui creusent le déficit, et ils
                ne coûtent rien à la récupération.
              </p>
            </section>
          ) : done ? (
            <section className="card p-6">
              <h2 className="text-[17px] font-bold">Séance terminée ✓</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {session.title} bouclée. Repos, protéines, et on remet ça.
              </p>
            </section>
          ) : (
            <StartWorkout sessionTitle={session.title} resume={Boolean(open)} />
          )}
        </div>

        {session && !done && (
          <>
            <h2 className="display mt-8 text-[1.35rem]">Au programme</h2>
            <ol className="mt-4 space-y-2">
              {resolveSession(session).map((p, i) => (
                <li key={p.slug} className="card-solid p-4">
                  <div className="flex items-start gap-3">
                    <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken text-[11px] font-bold text-ink-soft">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-semibold">{p.exercise.name}</p>
                      <p className="tnum mt-0.5 text-[12px] text-muted">
                        {p.sets} × {p.reps} · repos {p.restSeconds}s
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}

        <h2 className="display mt-9 text-[1.35rem]">Pas</h2>
        <div className="mt-4">
          <StepsCard
            steps={log.steps}
            goal={log.stepsGoal}
            earnedKcal={budget.earnedKcal}
            synced={Boolean(log.stepsSyncedAt)}
          />
        </div>

        <div className="mt-9 flex items-baseline justify-between gap-3">
          <h2 className="display text-[1.35rem]">La semaine</h2>
          <Link href="/bouger/exercices" className="text-[12.5px] font-semibold text-accent">
            Tous les exercices →
          </Link>
        </div>

        <ul className="card mt-4 divide-y divide-line">
          {SESSIONS.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold">{s.title}</p>
                <p className="truncate text-[11.5px] text-muted">{s.focus}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  s.weekday === weekday ? "bg-accent text-white" : "bg-sunken text-muted"
                }`}
              >
                {WEEKDAY_SHORT[s.weekday - 1]}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 px-1 text-[11.5px] leading-relaxed text-faint">
          {CHALLENGE.workoutWeekdays.length} séances par semaine, lourdes et courtes. En déficit, la
          récupération est la ressource rare : le volume est volontairement contenu.
        </p>

        {history.length > 0 && (
          <>
            <h2 className="display mt-9 text-[1.35rem]">Historique</h2>
            <ul className="card mt-4 divide-y divide-line">
              {history.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">{w.name}</p>
                    <p className="text-[11px] text-muted">{formatDayFR(w.day)}</p>
                  </div>
                  <span className="tnum shrink-0 text-[11.5px] text-muted">
                    {w.durationMinutes} min · {w.kcal} kcal
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}
