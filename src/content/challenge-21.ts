/**
 * The 21-day challenge, as data.
 *
 * Deliberately hard-coded rather than generated: the plan should not drift
 * between sessions, and every screen reads the same numbers from here.
 */

export const CHALLENGE = {
  name: "Défi 21 jours",
  durationDays: 21,

  /** Step goal per week of the challenge. Ramps rather than starting at 18k. */
  stepsRamp: [12_000, 15_000, 18_000],

  /**
   * Training days as ISO weekday numbers (1 = Monday). Four full-body sessions:
   * two on, one off, two on, two off. Heavy and low-volume, because recovery is
   * the thing in short supply on an aggressive deficit.
   */
  workoutWeekdays: [1, 2, 4, 5],

  /**
   * Refeed lands on Friday: a training day, and the point in the week where
   * adherence usually starts to slip. Extra carbs only - fat and protein hold.
   */
  refeedWeekday: 5,

  waterGoalMl: 3000,
  sessionMinutes: 55,
} as const;

/** ISO weekday, 1 = Monday .. 7 = Sunday. */
export function isoWeekday(isoDay: string): number {
  const dt = new Date(isoDay + "T00:00:00Z");
  return ((dt.getUTCDay() + 6) % 7) + 1;
}

/** Step goal for a given day of the challenge (1-based). */
export function stepsGoalForDayNumber(dayNumber: number): number {
  const week = Math.floor((Math.max(1, dayNumber) - 1) / 7);
  return CHALLENGE.stepsRamp[Math.min(week, CHALLENGE.stepsRamp.length - 1)];
}

export function isWorkoutDay(isoDay: string): boolean {
  return (CHALLENGE.workoutWeekdays as readonly number[]).includes(isoWeekday(isoDay));
}

export function isRefeedDay(isoDay: string): boolean {
  return isoWeekday(isoDay) === CHALLENGE.refeedWeekday;
}

/** Human-readable summary, shown once at the end of onboarding. */
export const CHALLENGE_RULES_FR = [
  "3 semaines, du jour 1 au jour 21, sans interruption.",
  "Pas : 12 000 la semaine 1, 15 000 la semaine 2, 18 000 la semaine 3.",
  "Muscu : 4 séances full-body en salle par semaine (lun, mar, jeu, ven), lourd et court.",
  "Protéines : l'objectif du jour est non négociable, c'est lui qui protège le muscle.",
  "Recharge glucidique le vendredi : +80 g de glucides, calculée, pas un cheat day.",
  "3 L d'eau par jour.",
  "Pesée tous les matins, à jeun, après être passé aux toilettes.",
];
