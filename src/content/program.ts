import { findExercise, type ExerciseDef } from "@/content/exercises";

/**
 * The 4-session full-body week, for a complete gym.
 *
 * Heavy and short on purpose. In a 40% deficit recovery is the scarce resource,
 * so the job of training is to give the body a reason to keep the muscle, not to
 * burn calories — the walking does that far more cheaply. Low volume, compound
 * lifts first, loads kept as high as form allows.
 *
 * Exercises are referenced by slug so every set logged can be tied back to the
 * catalogue, which is what makes progressive overload measurable.
 */

export interface ExercisePrescription {
  slug: string;
  sets: number;
  reps: string;
  restSeconds: number;
  note?: string;
}

export interface Session {
  id: "A" | "B" | "C" | "D";
  /** ISO weekday it lands on (1 = Monday). */
  weekday: number;
  title: string;
  focus: string;
  exercises: ExercisePrescription[];
}

export const SESSIONS: Session[] = [
  {
    id: "A",
    weekday: 1,
    title: "Full-body A",
    focus: "Jambes + poussée",
    exercises: [
      { slug: "squat", sets: 4, reps: "5-6", restSeconds: 180, note: "Le mouvement lourd de la séance. Prends ton temps entre les séries." },
      { slug: "developpe-couche", sets: 4, reps: "5-6", restSeconds: 180 },
      { slug: "rowing-barre", sets: 3, reps: "8-10", restSeconds: 120 },
      { slug: "elevations-laterales", sets: 3, reps: "12-15", restSeconds: 60 },
      { slug: "planche", sets: 3, reps: "45 s", restSeconds: 45 },
    ],
  },
  {
    id: "B",
    weekday: 2,
    title: "Full-body B",
    focus: "Chaîne postérieure + tirage",
    exercises: [
      { slug: "souleve-de-terre-roumain", sets: 4, reps: "6-8", restSeconds: 180 },
      { slug: "tractions", sets: 4, reps: "6-10", restSeconds: 150, note: "Si tu bloques, fais les descentes lentement." },
      { slug: "developpe-militaire", sets: 3, reps: "6-8", restSeconds: 150 },
      { slug: "presse-a-cuisses", sets: 3, reps: "10-12", restSeconds: 120 },
      { slug: "curl-halteres", sets: 3, reps: "10-12", restSeconds: 60 },
    ],
  },
  {
    id: "C",
    weekday: 4,
    title: "Full-body C",
    focus: "Volume contrôlé",
    exercises: [
      { slug: "fentes-marchees", sets: 3, reps: "10 / jambe", restSeconds: 120 },
      { slug: "developpe-incline-halteres", sets: 4, reps: "8-10", restSeconds: 150 },
      { slug: "rowing-haltere", sets: 3, reps: "10-12", restSeconds: 90 },
      { slug: "face-pull", sets: 3, reps: "15", restSeconds: 60 },
      { slug: "releves-jambes", sets: 3, reps: "12-15", restSeconds: 60 },
    ],
  },
  {
    id: "D",
    weekday: 5,
    title: "Full-body D",
    focus: "Lourd + recharge",
    exercises: [
      { slug: "souleve-de-terre", sets: 3, reps: "4-5", restSeconds: 240, note: "La séance la plus dure de la semaine. C'est aussi le jour de recharge glucidique." },
      { slug: "developpe-couche-halteres", sets: 4, reps: "8-10", restSeconds: 150 },
      { slug: "tirage-horizontal", sets: 3, reps: "10-12", restSeconds: 90 },
      { slug: "leg-curl", sets: 3, reps: "12-15", restSeconds: 75 },
      { slug: "extensions-triceps-poulie", sets: 3, reps: "12-15", restSeconds: 60 },
    ],
  },
];

export function sessionForWeekday(weekday: number): Session | null {
  return SESSIONS.find((s) => s.weekday === weekday) ?? null;
}

export interface ResolvedPrescription extends ExercisePrescription {
  exercise: ExerciseDef;
}

/** Prescriptions with their catalogue entry attached, ready to render. */
export function resolveSession(session: Session): ResolvedPrescription[] {
  return session.exercises
    .map((p) => {
      const exercise = findExercise(p.slug);
      return exercise ? { ...p, exercise } : null;
    })
    .filter((p): p is ResolvedPrescription => p !== null);
}
