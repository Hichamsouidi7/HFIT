/**
 * The 4-session full-body week, for a complete gym.
 *
 * Heavy and short on purpose. In a 40% deficit recovery is the scarce resource,
 * so the job of training is to give the body a reason to keep the muscle, not to
 * burn calories - the walking does that far more cheaply. Low volume, compound
 * lifts first, loads kept as high as form allows.
 */

export interface ExercisePrescription {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  cue?: string;
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
      { name: "Squat barre", sets: 4, reps: "5-6", restSeconds: 180, cue: "Lourd. Descends jusqu'à la cuisse parallèle." },
      { name: "Développé couché", sets: 4, reps: "5-6", restSeconds: 180, cue: "Omoplates serrées, barre au bas des pectoraux." },
      { name: "Rowing barre", sets: 3, reps: "8-10", restSeconds: 120 },
      { name: "Élévations latérales", sets: 3, reps: "12-15", restSeconds: 60, cue: "Léger, c'est du volume d'épaules." },
      { name: "Gainage planche", sets: 3, reps: "45 s", restSeconds: 45 },
    ],
  },
  {
    id: "B",
    weekday: 2,
    title: "Full-body B",
    focus: "Chaîne postérieure + tirage",
    exercises: [
      { name: "Soulevé de terre roumain", sets: 4, reps: "6-8", restSeconds: 180, cue: "Dos plat, la barre frôle les cuisses." },
      { name: "Tractions (ou tirage vertical)", sets: 4, reps: "6-10", restSeconds: 150 },
      { name: "Développé militaire", sets: 3, reps: "6-8", restSeconds: 150 },
      { name: "Presse à cuisses", sets: 3, reps: "10-12", restSeconds: 120 },
      { name: "Curl biceps haltères", sets: 3, reps: "10-12", restSeconds: 60 },
    ],
  },
  {
    id: "C",
    weekday: 4,
    title: "Full-body C",
    focus: "Volume contrôlé",
    exercises: [
      { name: "Fentes marchées haltères", sets: 3, reps: "10 / jambe", restSeconds: 120 },
      { name: "Développé incliné haltères", sets: 4, reps: "8-10", restSeconds: 150 },
      { name: "Rowing haltère unilatéral", sets: 3, reps: "10-12", restSeconds: 90 },
      { name: "Face pull", sets: 3, reps: "15", restSeconds: 60, cue: "Pour les épaules et la posture." },
      { name: "Relevés de jambes suspendu", sets: 3, reps: "12-15", restSeconds: 60 },
    ],
  },
  {
    id: "D",
    weekday: 5,
    title: "Full-body D",
    focus: "Lourd + recharge",
    exercises: [
      { name: "Soulevé de terre", sets: 3, reps: "4-5", restSeconds: 240, cue: "La séance la plus dure. C'est le jour de recharge glucidique." },
      { name: "Développé couché haltères", sets: 4, reps: "8-10", restSeconds: 150 },
      { name: "Tirage horizontal poulie", sets: 3, reps: "10-12", restSeconds: 90 },
      { name: "Leg curl", sets: 3, reps: "12-15", restSeconds: 75 },
      { name: "Extensions triceps poulie", sets: 3, reps: "12-15", restSeconds: 60 },
    ],
  },
];

export function sessionForWeekday(weekday: number): Session | null {
  return SESSIONS.find((s) => s.weekday === weekday) ?? null;
}
