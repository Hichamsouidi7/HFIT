import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercises, workoutSets, workouts } from "@/db/schema";
import { BottomNav } from "@/components/BottomNav";
import { ExerciseBrowser, type ExerciseStat } from "@/components/ExerciseBrowser";
import { PageHeader } from "@/components/ui";
import { getProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  // Best recorded set per exercise, ranked by load then reps — the simplest
  // definition of "record" that stays honest for bodyweight work too.
  const rows = await db
    .select({
      slug: exercises.slug,
      day: workouts.day,
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .where(sql`${workouts.completedAt} is not null`)
    .orderBy(desc(workoutSets.weightKg), desc(workoutSets.reps));

  const stats: Record<string, ExerciseStat> = {};
  for (const row of rows) {
    if (stats[row.slug]) continue;
    stats[row.slug] = {
      slug: row.slug,
      day: row.day,
      bestWeight: row.weightKg,
      bestReps: row.reps,
    };
  }

  return (
    <>
      <main className="mx-auto max-w-md px-5">
        <PageHeader
          title="Exercices"
          subtitle="Le catalogue, avec la consigne qui compte pour chacun."
          back="/bouger"
        />
        <div className="mt-6">
          <ExerciseBrowser stats={stats} />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
