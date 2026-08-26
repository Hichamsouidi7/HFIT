import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { StepsCard } from "@/components/DayCards";
import { CHALLENGE, isoWeekday } from "@/content/challenge-21";
import { SESSIONS, sessionForWeekday } from "@/content/program";
import { formatDayFR, todayISO } from "@/lib/day";
import { getDayView, getProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MovePage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  const day = todayISO();
  const view = await getDayView(day);
  if (!view) redirect("/bienvenue");

  const { log, budget } = view;
  const session = sessionForWeekday(isoWeekday(day));

  return (
    <>
      <main className="mx-auto max-w-md px-5 pt-10">
        <h1 className="display text-[2.4rem]">Bouger</h1>
        <p className="mt-2 text-[13px] text-muted">{formatDayFR(day)}</p>

        {session ? (
          <>
            <section className="mt-5 rounded-[1.75rem] bg-accent p-5 text-white shadow-[0_8px_24px_-8px_rgb(233_99_60/0.5)]">
              <p className="text-[12px] font-medium text-white/70">Séance du jour</p>
              <h2 className="mt-1 text-[22px] font-bold tracking-tight">{session.title}</h2>
              <p className="mt-1 text-[13px] text-white/85">
                {session.focus} · {CHALLENGE.sessionMinutes} min
              </p>
            </section>

            <ol className="mt-4 space-y-2.5">
              {session.exercises.map((ex, i) => (
                <li key={ex.name} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken text-[11px] font-bold text-ink-soft">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">{ex.name}</p>
                      <p className="tnum mt-0.5 text-[12px] text-muted">
                        {ex.sets} × {ex.reps} · repos {ex.restSeconds}s
                      </p>
                      {ex.cue && (
                        <p className="mt-1.5 text-[12px] leading-snug text-faint">{ex.cue}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-4 rounded-2xl bg-sunken p-4 text-[12px] leading-relaxed text-ink-soft">
              L&apos;enregistrement des séries et le chrono de repos arrivent à la prochaine étape.
              Pour ce soir, la séance est là : suis-la et note tes charges où tu veux.
            </p>
          </>
        ) : (
          <section className="card mt-5 p-6">
            <h2 className="text-[17px] font-bold">Repos aujourd&apos;hui</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Pas de muscu prévue. Garde les pas : c&apos;est eux qui creusent le déficit, et ils ne
              coûtent rien à la récupération.
            </p>
          </section>
        )}

        <h2 className="display mt-9 text-[1.4rem]">Pas</h2>
        <div className="mt-4">
          <StepsCard
            steps={log.steps}
            goal={log.stepsGoal}
            earnedKcal={budget.earnedKcal}
            synced={Boolean(log.stepsSyncedAt)}
          />
        </div>

        <h2 className="display mt-9 text-[1.4rem]">La semaine</h2>
        <ul className="card mt-4 divide-y divide-line">
          {SESSIONS.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold">{s.title}</p>
                <p className="truncate text-[11px] text-muted">{s.focus}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  s.weekday === isoWeekday(day) ? "bg-accent text-white" : "bg-sunken text-muted"
                }`}
              >
                {["lun", "mar", "mer", "jeu", "ven", "sam", "dim"][s.weekday - 1]}
              </span>
            </li>
          ))}
        </ul>
      </main>
      <BottomNav />
    </>
  );
}
