/**
 * Day handling.
 *
 * Vercel runs in UTC, but the user lives in Paris. Without an explicit timezone
 * everything logged between midnight and 2am would land on the previous day, so
 * every "what day is it" question in the app goes through here.
 */
export const TIMEZONE = "Europe/Paris";

/** Today in Paris, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return toISODay(now);
}

/** Convert an instant to its YYYY-MM-DD day in Paris. */
export function toISODay(d: Date): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape Postgres wants.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Shift an ISO day by a number of days (negative to go back). */
export function addDays(isoDay: string, days: number): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Whole days between two ISO days (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z");
  return Math.round(ms / 86_400_000);
}

/** Monday of the week containing the given ISO day. */
export function weekStart(isoDay: string): string {
  const dt = new Date(isoDay + "T00:00:00Z");
  const dow = (dt.getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(isoDay, -dow);
}

const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** French long form, e.g. "mardi 26 août". */
export function formatDayFR(isoDay: string): string {
  const dt = new Date(isoDay + "T00:00:00Z");
  const dow = (dt.getUTCDay() + 6) % 7;
  return `${DAY_NAMES[dow]} ${dt.getUTCDate()} ${MONTH_NAMES[dt.getUTCMonth()]}`;
}

export const MEALS = [
  { id: "petit-dejeuner", label: "Petit-déj" },
  { id: "dejeuner", label: "Déjeuner" },
  { id: "diner", label: "Dîner" },
  { id: "collation", label: "Collation" },
] as const;

export type MealId = (typeof MEALS)[number]["id"];

/** Which meal a given hour belongs to. Shared by the server and the client. */
export function mealForHour(hour: number): MealId {
  if (hour < 11) return "petit-dejeuner";
  if (hour < 15) return "dejeuner";
  if (hour < 18) return "collation";
  return "diner";
}

/** Current hour in Paris, so the server and the phone agree on the meal. */
export function hourInParis(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
}

export function currentMeal(now: Date = new Date()): MealId {
  return mealForHour(hourInParis(now));
}
