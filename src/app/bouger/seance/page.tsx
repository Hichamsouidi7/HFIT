import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { SessionRunner, type RunnerExercise } from "@/components/SessionRunner";
import { isoWeekday } from "@/content/challenge-21";
import { resolveSession, sessionForWeekday } from "@/content/program";
import { todayISO } from "@/lib/day";
import { getOpenWorkout, getProfile, getWorkoutSets, lastPerformances } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SessionPage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  const day = todayISO();
  const workout = await getOpenWorkout(day);
  // The session is created by the "start" button on /bouger, never by loading
  // this page — otherwise every stray visit would open an empty workout.
  if (!workout) redirect("/bouger");

  const session = sessionForWeekday(isoWeekday(day));
  if (!session) redirect("/bouger");

  const prescriptions = resolveSession(session);
  const [sets, history] = await Promise.all([
    getWorkoutSets(workout.id),
    lastPerformances(prescriptions.map((p) => p.slug)),
  ]);

  const exercises: RunnerExercise[] = prescriptions.map((p) => ({
    slug: p.slug,
    name: p.exercise.name,
    cues: p.exercise.cues,
    sets: p.sets,
    reps: p.reps,
    restSeconds: p.restSeconds,
    note: p.note,
    last: history[p.slug]
      ? {
          day: history[p.slug]!.day,
          sets: history[p.slug]!.sets.map((s) => ({
            setNumber: s.setNumber,
            reps: s.reps,
            weightKg: s.weightKg,
          })),
        }
      : null,
  }));

  return (
    <>
      <main className="mx-auto max-w-md px-5 pb-4">
        <SessionRunner
          workoutId={workout.id}
          sessionTitle={session.title}
          exercises={exercises}
          initialSets={sets}
          startedAt={workout.createdAt.toISOString()}
        />
      </main>
      <BottomNav />
    </>
  );
}
