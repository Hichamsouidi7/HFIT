/**
 * Seeds the exercise catalogue from src/content/exercises.ts.
 *
 * Idempotent: re-running it updates the definitions in place rather than
 * duplicating them, so the sets already logged keep pointing at the right row.
 *
 *   npm run seed:exercises
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { db } from "../src/db";
import { exercises } from "../src/db/schema";
import { EXERCISES } from "../src/content/exercises";

async function main() {
  for (const e of EXERCISES) {
    await db
      .insert(exercises)
      .values({
        slug: e.slug,
        name: e.name,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment,
        isCompound: e.isCompound,
        cues: e.cues,
      })
      .onConflictDoUpdate({
        target: exercises.slug,
        set: {
          name: e.name,
          muscleGroup: e.muscleGroup,
          equipment: e.equipment,
          isCompound: e.isCompound,
          cues: e.cues,
        },
      });
  }

  console.log(`${EXERCISES.length} exercices en base.`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
