import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  challengeDays,
  challenges,
  dailyLogs,
  foodEntries,
  foods,
  profile,
  weighIns,
} from "@/db/schema";
import {
  applyRefeed,
  dailyPlan,
  liveBudget,
  macroTargets,
  nextTrend,
  trendSeries,
  type Aggressiveness,
  type MacroTargets,
  type Profile as EngineProfile,
  type Sex,
} from "@/lib/nutrition";
import { daysBetween, todayISO } from "@/lib/day";
import { searchVariants } from "@/lib/search";
import { CHALLENGE, isRefeedDay, isWorkoutDay, stepsGoalForDayNumber } from "@/content/challenge-21";

export type ProfileRow = typeof profile.$inferSelect;
export type DailyLogRow = typeof dailyLogs.$inferSelect;
export type FoodEntryRow = typeof foodEntries.$inferSelect;
export type FoodRow = typeof foods.$inferSelect;

export async function getProfile(): Promise<ProfileRow | null> {
  const rows = await db.select().from(profile).where(eq(profile.id, 1)).limit(1);
  return rows[0] ?? null;
}

/** Most recent weigh-in, or the starting weight if he has never weighed in. */
export async function getCurrentWeight(p: ProfileRow): Promise<number> {
  const rows = await db
    .select({ weightKg: weighIns.weightKg })
    .from(weighIns)
    .orderBy(desc(weighIns.day))
    .limit(1);
  return rows[0]?.weightKg ?? p.startWeightKg;
}

/**
 * Turn the stored profile into the shape the calculation engine expects.
 * Always uses the CURRENT weight, not the starting one - as he leans out, both
 * his BMR and his walking burn drop, and the targets have to follow.
 */
export function toEngineProfile(p: ProfileRow, currentWeightKg: number): EngineProfile {
  return {
    sex: p.sex as Sex,
    age: p.age,
    heightCm: p.heightCm,
    weightKg: currentWeightKg,
    targetWeightKg: p.targetWeightKg,
    bodyFatPct: p.bodyFatPct,
    aggressiveness: p.aggressiveness as Aggressiveness,
  };
}

export async function getActiveChallenge() {
  const rows = await db
    .select()
    .from(challenges)
    .where(eq(challenges.status, "active"))
    .orderBy(desc(challenges.startDay))
    .limit(1);
  return rows[0] ?? null;
}

export interface DayContext {
  day: string;
  dayNumber: number | null;
  stepsGoal: number;
  workoutPlanned: boolean;
  refeed: boolean;
}

/**
 * What the plan asks of a given day. During a challenge the step goal ramps and
 * the training days are fixed; outside one, it falls back to the profile goal.
 */
export async function getDayContext(day: string): Promise<DayContext> {
  const p = await getProfile();
  const challenge = await getActiveChallenge();

  if (challenge) {
    const dayNumber = daysBetween(challenge.startDay, day) + 1;
    if (dayNumber >= 1 && dayNumber <= CHALLENGE.durationDays) {
      return {
        day,
        dayNumber,
        stepsGoal: stepsGoalForDayNumber(dayNumber),
        workoutPlanned: isWorkoutDay(day),
        refeed: isRefeedDay(day),
      };
    }
  }

  return {
    day,
    dayNumber: null,
    stepsGoal: p?.stepsGoal ?? 10_000,
    workoutPlanned: isWorkoutDay(day),
    refeed: false,
  };
}

/**
 * Fetch the day's log, creating it on first touch with the targets FROZEN.
 *
 * Freezing matters: a past day must keep the goals it was actually judged
 * against, otherwise changing the plan today would silently rewrite last week's
 * scores.
 */
export async function getOrCreateDailyLog(day: string): Promise<DailyLogRow> {
  const existing = await db.select().from(dailyLogs).where(eq(dailyLogs.day, day)).limit(1);
  if (existing[0]) return existing[0];

  const p = await getProfile();
  if (!p) throw new Error("Profil manquant : termine d'abord l'installation.");

  const currentWeight = await getCurrentWeight(p);
  const ctx = await getDayContext(day);
  const plan = dailyPlan(toEngineProfile(p, currentWeight), {
    stepsGoal: ctx.stepsGoal,
    workoutPlannedMinutes: ctx.workoutPlanned ? CHALLENGE.sessionMinutes : 0,
  });
  const targets = ctx.refeed ? applyRefeed(plan.targets) : plan.targets;

  const inserted = await db
    .insert(dailyLogs)
    .values({
      day,
      stepsGoal: ctx.stepsGoal,
      kcalGoal: targets.kcal,
      proteinGoalG: targets.proteinG,
      fatGoalG: targets.fatG,
      carbsGoalG: targets.carbsG,
      isRefeedDay: ctx.refeed,
    })
    // Two requests can race on the first load of the day; let the unique index
    // settle it rather than throwing at the user.
    .onConflictDoNothing({ target: dailyLogs.day })
    .returning();

  if (inserted[0]) return inserted[0];

  const after = await db.select().from(dailyLogs).where(eq(dailyLogs.day, day)).limit(1);
  return after[0];
}

export interface DayTotals {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export async function getDayTotals(day: string): Promise<DayTotals> {
  const rows = await db
    .select({
      kcal: sql<number>`coalesce(sum(${foodEntries.kcal}), 0)`,
      proteinG: sql<number>`coalesce(sum(${foodEntries.proteinG}), 0)`,
      fatG: sql<number>`coalesce(sum(${foodEntries.fatG}), 0)`,
      carbsG: sql<number>`coalesce(sum(${foodEntries.carbsG}), 0)`,
    })
    .from(foodEntries)
    .where(eq(foodEntries.day, day));

  const r = rows[0];
  return {
    kcal: Math.round(Number(r?.kcal ?? 0)),
    proteinG: Math.round(Number(r?.proteinG ?? 0)),
    fatG: Math.round(Number(r?.fatG ?? 0)),
    carbsG: Math.round(Number(r?.carbsG ?? 0)),
  };
}

export async function getDayEntries(day: string): Promise<FoodEntryRow[]> {
  return db
    .select()
    .from(foodEntries)
    .where(eq(foodEntries.day, day))
    .orderBy(asc(foodEntries.createdAt));
}

/**
 * Record a weigh-in and keep the trend series consistent.
 *
 * The trend is an EMA, so every later point depends on this one: editing an old
 * weight means rebuilding everything after it. Cheap at this scale, and it keeps
 * the chart honest.
 */
export async function saveWeighIn(day: string, weightKg: number, source = "manual") {
  const previous = await db
    .select({ trendKg: weighIns.trendKg })
    .from(weighIns)
    .where(sql`${weighIns.day} < ${day}`)
    .orderBy(desc(weighIns.day))
    .limit(1);

  const trendKg = nextTrend(previous[0]?.trendKg ?? null, weightKg);

  await db
    .insert(weighIns)
    .values({ day, weightKg, trendKg, source })
    .onConflictDoUpdate({
      target: weighIns.day,
      set: { weightKg, trendKg, source },
    });

  await rebuildTrendsFrom(day);
}

/** Recompute the EMA for every weigh-in from a given day onwards. */
export async function rebuildTrendsFrom(day: string) {
  const before = await db
    .select({ trendKg: weighIns.trendKg })
    .from(weighIns)
    .where(sql`${weighIns.day} < ${day}`)
    .orderBy(desc(weighIns.day))
    .limit(1);

  const rows = await db
    .select({ id: weighIns.id, weightKg: weighIns.weightKg })
    .from(weighIns)
    .where(gte(weighIns.day, day))
    .orderBy(asc(weighIns.day));

  let trend: number | null = before[0]?.trendKg ?? null;
  for (const row of rows) {
    trend = nextTrend(trend, row.weightKg);
    await db.update(weighIns).set({ trendKg: trend }).where(eq(weighIns.id, row.id));
  }
}

export async function getWeighIns(limit = 120) {
  const rows = await db
    .select()
    .from(weighIns)
    .orderBy(desc(weighIns.day))
    .limit(limit);
  return rows.reverse();
}

/** Full picture of a day, ready to render. */
export async function getDayView(day: string = todayISO()) {
  const p = await getProfile();
  if (!p) return null;

  const currentWeight = await getCurrentWeight(p);
  const log = await getOrCreateDailyLog(day);
  const totals = await getDayTotals(day);
  const ctx = await getDayContext(day);
  const engineProfile = toEngineProfile(p, currentWeight);

  const targets: MacroTargets = {
    kcal: log.kcalGoal,
    proteinG: log.proteinGoalG,
    fatG: log.fatGoalG,
    carbsG: log.carbsGoalG,
    floored: false,
  };

  const budget = liveBudget({
    profile: engineProfile,
    targets,
    stepsGoal: log.stepsGoal,
    actualSteps: log.steps,
    workoutPlannedMinutes: ctx.workoutPlanned ? CHALLENGE.sessionMinutes : 0,
    workoutDoneMinutes: ctx.workoutPlanned ? CHALLENGE.sessionMinutes : 0,
  });

  return { profile: p, currentWeight, log, totals, targets, budget, ctx };
}

/**
 * Food search, ranked.
 *
 * A plain "contains" match is unusable on CIQUAL: "oeuf" matches "boeuf
 * bourguignon", and "riz" surfaces "Riz cantonais" ahead of plain cooked rice.
 * So matches are ranked by how the query lands in the name -
 * whole name, then start of name, then start of any word, then anywhere - and
 * ties break on the shortest name, which reliably means the plainest food.
 * Foods he actually eats jump the queue via useCount.
 */
export async function searchFoods(query: string, limit = 30): Promise<FoodRow[]> {
  const variants = searchVariants(query);
  if (variants.length === 0) return recentFoods(limit);

  const [q] = variants;
  const likeAny = sql.join(
    variants.map((v) => sql`${foods.searchName} like ${"%" + v + "%"}`),
    sql` or `,
  );

  return db
    .select()
    .from(foods)
    .where(likeAny)
    .orderBy(
      sql`case
        when ${foods.searchName} = ${q} then 0
        when ${foods.searchName} like ${q + " %"} then 1
        when ${foods.searchName} like ${"% " + q + " %"} then 2
        when ${foods.searchName} like ${"% " + q} then 2
        when ${foods.searchName} like ${q + "%"} then 3
        else 4
      end`,
      desc(foods.useCount),
      sql`length(${foods.name})`,
      asc(foods.name),
    )
    .limit(limit);
}

export async function recentFoods(limit = 12): Promise<FoodRow[]> {
  return db
    .select()
    .from(foods)
    .where(sql`${foods.useCount} > 0`)
    .orderBy(desc(foods.useCount))
    .limit(limit);
}

export async function saveChallengeDayScore(day: string, score: number, breakdown: unknown) {
  const challenge = await getActiveChallenge();
  if (!challenge) return;
  const dayNumber = daysBetween(challenge.startDay, day) + 1;
  if (dayNumber < 1 || dayNumber > CHALLENGE.durationDays) return;

  await db
    .insert(challengeDays)
    .values({ challengeId: challenge.id, day, dayNumber, score, breakdown })
    .onConflictDoUpdate({
      target: [challengeDays.challengeId, challengeDays.day],
      set: { score, breakdown },
    });
}

export { trendSeries, macroTargets, and, eq };
