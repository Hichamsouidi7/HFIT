/**
 * HFit calculation engine.
 *
 * Every number the app shows comes from here. Pure functions only, no I/O,
 * so this file can be reasoned about and tested in isolation.
 *
 * References:
 *  - BMR: Mifflin-St Jeor (1990); Katch-McArdle when body-fat % is known.
 *  - Walking cost: ~0.5 kcal per kg of bodyweight per km (net of resting).
 *  - Protein under deficit: Helms et al. 2014 - 2.3-3.1 g/kg fat-free mass,
 *    scaled up with the severity of the deficit and leanness.
 *  - Fat mass energy density: 7700 kcal per kg.
 */

export type Sex = "male" | "female";

/** How hard the cut is. "extreme" is the default during the 21-day challenge. */
export type Aggressiveness = "moderate" | "aggressive" | "extreme";

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  /** Optional. When present, BMR switches to Katch-McArdle (more accurate). */
  bodyFatPct?: number | null;
  aggressiveness: Aggressiveness;
}

export interface MacroTargets {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** True when the deficit had to be capped to respect the protein+fat floor. */
  floored: boolean;
}

/** Energy in one kg of body fat. */
export const KCAL_PER_KG_FAT = 7700;

/** Net energy cost of walking, per kg of bodyweight, per km. */
export const KCAL_PER_KG_PER_KM = 0.5;

/** Multiplier applied to BMR to cover everything that is not steps or lifting. */
export const SEDENTARY_MULTIPLIER = 1.2;

/** Smoothing factor of the trend weight (Hacker's Diet style EMA). */
export const TREND_ALPHA = 0.1;

const DEFICIT_PCT: Record<Aggressiveness, number> = {
  moderate: 0.25,
  aggressive: 0.35,
  extreme: 0.4,
};

/**
 * Protein in g per kg of TARGET bodyweight. Scales up with the deficit, which
 * is what protects muscle when calories are low.
 */
const PROTEIN_PER_KG_TARGET: Record<Aggressiveness, number> = {
  moderate: 2.0,
  aggressive: 2.3,
  extreme: 2.5,
};

/** Fat in g per kg of CURRENT bodyweight. Hormonal floor, never goes lower. */
const FAT_PER_KG_CURRENT = 0.6;

/** Basal metabolic rate, in kcal/day. */
export function bmr(profile: Profile): number {
  const { bodyFatPct, weightKg, heightCm, age, sex } = profile;

  // Katch-McArdle uses lean mass directly, so it beats Mifflin whenever we
  // actually know the body-fat percentage.
  if (bodyFatPct != null && bodyFatPct > 0 && bodyFatPct < 70) {
    const leanMassKg = weightKg * (1 - bodyFatPct / 100);
    return Math.round(370 + 21.6 * leanMassKg);
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

/** Average step length in metres, derived from height. */
export function strideLengthM(heightCm: number, sex: Sex = "male"): number {
  return (heightCm * (sex === "male" ? 0.415 : 0.413)) / 100;
}

/** Distance covered by a step count, in km. */
export function stepsToKm(steps: number, heightCm: number, sex: Sex = "male"): number {
  return (steps * strideLengthM(heightCm, sex)) / 1000;
}

/** Energy burned walking a given number of steps, in kcal. */
export function walkingKcal(
  steps: number,
  weightKg: number,
  heightCm: number,
  sex: Sex = "male",
): number {
  return Math.round(stepsToKm(steps, heightCm, sex) * weightKg * KCAL_PER_KG_PER_KM);
}

/**
 * Rough energy cost of a resistance-training session.
 * Heavy compound work sits around 5 kcal/min for an 85 kg lifter; we scale it
 * by bodyweight so the number tracks him as he leans out.
 */
export function workoutKcal(minutes: number, weightKg: number): number {
  return Math.round(minutes * 0.059 * weightKg);
}

export interface ExpenditureInput {
  profile: Profile;
  steps: number;
  workoutMinutes?: number;
}

export interface Expenditure {
  bmr: number;
  /** BMR x sedentary multiplier: living, digesting, fidgeting. */
  baseline: number;
  walking: number;
  training: number;
  total: number;
}

/**
 * Total daily expenditure, built component by component rather than from a
 * vague "activity level". This is what lets the calorie budget grow live as he
 * walks: more steps in, more calories available.
 */
export function expenditure({ profile, steps, workoutMinutes = 0 }: ExpenditureInput): Expenditure {
  const bmrValue = bmr(profile);
  const baseline = Math.round(bmrValue * SEDENTARY_MULTIPLIER);
  const walking = walkingKcal(steps, profile.weightKg, profile.heightCm, profile.sex);
  const training = workoutMinutes > 0 ? workoutKcal(workoutMinutes, profile.weightKg) : 0;

  return {
    bmr: bmrValue,
    baseline,
    walking,
    training,
    total: baseline + walking + training,
  };
}

/**
 * Daily macro targets for a given expenditure.
 *
 * Protein and fat are set first and are non-negotiable; carbs take whatever is
 * left. If the requested deficit would eat into that protein+fat floor, we
 * raise the calories back up to the floor and report it via "floored" - below
 * that line the "lean and muscular" outcome stops being physically reachable.
 */
export function macroTargets(profile: Profile, totalExpenditure: number): MacroTargets {
  const proteinG = Math.round(
    PROTEIN_PER_KG_TARGET[profile.aggressiveness] * profile.targetWeightKg,
  );
  const fatG = Math.round(FAT_PER_KG_CURRENT * profile.weightKg);

  const floorKcal = proteinG * 4 + fatG * 9;
  const requestedKcal = Math.round(totalExpenditure * (1 - DEFICIT_PCT[profile.aggressiveness]));

  const floored = requestedKcal < floorKcal;
  const rawKcal = floored ? floorKcal : requestedKcal;
  const carbsG = Math.max(0, Math.round((rawKcal - proteinG * 4 - fatG * 9) / 4));

  // Derive the headline number back from the rounded macros so the ring and the
  // three bars can never disagree by a few kcal.
  const kcal = proteinG * 4 + fatG * 9 + carbsG * 4;

  return { kcal, proteinG, fatG, carbsG, floored };
}

export interface DayPlanInput {
  /** Steps he is aiming for today, not the steps he has already taken. */
  stepsGoal: number;
  workoutPlannedMinutes?: number;
}

export interface DayPlan {
  expenditure: Expenditure;
  targets: MacroTargets;
}

/**
 * The day's plan, computed from the step GOAL rather than the steps taken so far.
 *
 * This matters: if the budget were derived from live step count it would read
 * ~1300 kcal at breakfast and creep up all day, which is both useless for
 * planning meals and quietly encourages under-eating early. The budget is fixed
 * at wake-up; walking more than the goal earns a bonus on top (see liveBudget).
 */
export function dailyPlan(profile: Profile, input: DayPlanInput): DayPlan {
  const exp = expenditure({
    profile,
    steps: input.stepsGoal,
    workoutMinutes: input.workoutPlannedMinutes ?? 0,
  });
  return { expenditure: exp, targets: macroTargets(profile, exp.total) };
}

export interface LiveBudgetInput {
  profile: Profile;
  targets: MacroTargets;
  stepsGoal: number;
  actualSteps: number;
  workoutPlannedMinutes?: number;
  workoutDoneMinutes?: number;
}

export interface LiveBudget {
  /** Calories earned (or missing) versus the plan. Can be negative. */
  earnedKcal: number;
  /** What he can actually eat today. Bonus counts, shortfall does not subtract. */
  budgetKcal: number;
  /** Steps still needed to reach the goal. */
  stepsRemaining: number;
}

/**
 * Live reconciliation between the plan and the day as it actually went.
 *
 * A surplus of steps raises the budget. A shortfall does NOT lower it: by the
 * time he is behind on steps he has usually already eaten, and silently shrinking
 * the budget would just manufacture a failure. The gap is surfaced as a nudge
 * ("X steps left") instead, which is the action that can still be taken.
 */
export function liveBudget(input: LiveBudgetInput): LiveBudget {
  const { profile, targets, stepsGoal, actualSteps } = input;
  const { weightKg, heightCm, sex } = profile;

  const walkDelta =
    walkingKcal(actualSteps, weightKg, heightCm, sex) -
    walkingKcal(stepsGoal, weightKg, heightCm, sex);
  const trainDelta =
    workoutKcal(input.workoutDoneMinutes ?? 0, weightKg) -
    workoutKcal(input.workoutPlannedMinutes ?? 0, weightKg);

  const earnedKcal = walkDelta + trainDelta;

  return {
    earnedKcal,
    budgetKcal: targets.kcal + Math.max(0, earnedKcal),
    stepsRemaining: Math.max(0, stepsGoal - actualSteps),
  };
}

/** Extra carbs on a planned refeed day: performance fuel, not a cheat day. */
export const REFEED_EXTRA_CARBS_G = 80;

export function applyRefeed(targets: MacroTargets): MacroTargets {
  return {
    ...targets,
    carbsG: targets.carbsG + REFEED_EXTRA_CARBS_G,
    kcal: targets.kcal + REFEED_EXTRA_CARBS_G * 4,
  };
}

export interface Projection {
  dailyDeficit: number;
  weeklyFatLossKg: number;
  /** Fat lost over the window, water and glycogen excluded. */
  fatLossKg: number;
  daysToTarget: number | null;
}

/**
 * What the deficit actually buys, in kg. Deliberately reports FAT loss only -
 * the scale moves faster than this in week one because of water and glycogen,
 * and the app says so rather than taking credit for it.
 */
export function projection(
  totalExpenditure: number,
  intakeKcal: number,
  profile: Profile,
  days = 21,
): Projection {
  const dailyDeficit = Math.max(0, totalExpenditure - intakeKcal);
  const weeklyFatLossKg = (dailyDeficit * 7) / KCAL_PER_KG_FAT;
  const fatLossKg = (dailyDeficit * days) / KCAL_PER_KG_FAT;

  const kgToLose = profile.weightKg - profile.targetWeightKg;
  const daysToTarget =
    dailyDeficit > 0 && kgToLose > 0
      ? Math.ceil((kgToLose * KCAL_PER_KG_FAT) / dailyDeficit)
      : null;

  return { dailyDeficit, weeklyFatLossKg, fatLossKg, daysToTarget };
}

/**
 * Exponentially smoothed bodyweight.
 *
 * Raw daily weight swings by more than a kilo on water alone, especially in
 * week one of a low-carb deficit. The trend is the number worth reacting to -
 * showing it instead of the raw weight is what keeps him from quitting on day 9.
 */
export function nextTrend(previousTrend: number | null, todayWeightKg: number): number {
  if (previousTrend == null) return todayWeightKg;
  return previousTrend + TREND_ALPHA * (todayWeightKg - previousTrend);
}

/** Recompute the whole trend series from an ordered list of weigh-ins. */
export function trendSeries(weightsKg: number[]): number[] {
  const out: number[] = [];
  let trend: number | null = null;
  for (const w of weightsKg) {
    trend = nextTrend(trend, w);
    out.push(trend);
  }
  return out;
}

export interface DayScoreInput {
  steps: number;
  stepsGoal: number;
  proteinG: number;
  proteinGoalG: number;
  kcal: number;
  kcalGoal: number;
  workoutDone: boolean;
  workoutPlanned: boolean;
  waterMl: number;
  waterGoalMl: number;
}

export interface DayScore {
  steps: number;
  protein: number;
  calories: number;
  workout: number;
  water: number;
  total: number;
}

/**
 * Daily adherence score out of 100. Weighted towards the two things that decide
 * the outcome: steps (the deficit) and protein (the muscle).
 */
export function dayScore(input: DayScoreInput): DayScore {
  const ratio = (value: number, goal: number) => (goal > 0 ? Math.min(1, value / goal) : 0);

  const steps = Math.round(30 * ratio(input.steps, input.stepsGoal));
  const protein = Math.round(30 * ratio(input.proteinG, input.proteinGoalG));

  // Calories score on staying UNDER the target, with no reward for starving:
  // anything from 80% to 100% of the budget is full marks.
  let calories = 0;
  if (input.kcalGoal > 0) {
    const r = input.kcal / input.kcalGoal;
    if (r <= 1 && r >= 0.8) calories = 20;
    else if (r < 0.8) calories = Math.round(20 * (r / 0.8));
    else calories = Math.max(0, Math.round(20 * (1 - (r - 1) * 2)));
  }

  const workout = input.workoutPlanned ? (input.workoutDone ? 15 : 0) : 15;
  const water = Math.round(5 * ratio(input.waterMl, input.waterGoalMl));

  return {
    steps,
    protein,
    calories,
    workout,
    water,
    total: steps + protein + calories + workout + water,
  };
}

export interface AutopilotSuggestion {
  actualWeeklyLossKg: number;
  targetWeeklyLossKg: number;
  kcalAdjustment: number;
  stepsAdjustment: number;
  verdict: "on_track" | "too_slow" | "too_fast";
}

/**
 * Weekly auto-pilot: compares the real trend loss against the plan and says how
 * to correct. Acts on steps before calories, because adding a walk costs less
 * than removing food.
 */
export function autopilot(
  trendStartKg: number,
  trendEndKg: number,
  daysElapsed: number,
  targetWeeklyLossKg: number,
): AutopilotSuggestion {
  const actualWeeklyLossKg =
    daysElapsed > 0 ? ((trendStartKg - trendEndKg) / daysElapsed) * 7 : 0;
  const gapKg = targetWeeklyLossKg - actualWeeklyLossKg;

  // A quarter of a kilo per week either way is noise, not a signal.
  if (Math.abs(gapKg) < 0.25) {
    return {
      actualWeeklyLossKg,
      targetWeeklyLossKg,
      kcalAdjustment: 0,
      stepsAdjustment: 0,
      verdict: "on_track",
    };
  }

  // One week of trend data lags reality (the EMA is deliberately slow), so a
  // correction is a nudge, never a lurch. Capped both ways.
  const MAX_KCAL_STEP = 150;
  const MAX_STEPS_STEP = 2000;

  const dailyKcalGap = Math.round((gapKg * KCAL_PER_KG_FAT) / 7);

  if (gapKg > 0) {
    // Losing too slowly: ask for steps first, food second - adding a walk costs
    // him less than taking food away.
    const fromSteps = Math.min(dailyKcalGap, 100);
    const fromFood = Math.min(dailyKcalGap - fromSteps, MAX_KCAL_STEP);
    return {
      actualWeeklyLossKg,
      targetWeeklyLossKg,
      kcalAdjustment: -fromFood,
      stepsAdjustment: Math.min(Math.round(fromSteps * 20), MAX_STEPS_STEP),
      verdict: "too_slow",
    };
  }

  // Losing faster than planned: give calories back rather than steps, because
  // the food is what protects training quality and muscle.
  return {
    actualWeeklyLossKg,
    targetWeeklyLossKg,
    kcalAdjustment: Math.min(MAX_KCAL_STEP, -dailyKcalGap),
    stepsAdjustment: 0,
    verdict: "too_fast",
  };
}
