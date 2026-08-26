import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Single-user app: this table always holds exactly one row (id = 1). */
export const profile = pgTable("profile", {
  id: integer("id").primaryKey().default(1),
  sex: text("sex").notNull().default("male"),
  age: integer("age").notNull(),
  heightCm: real("height_cm").notNull(),
  startWeightKg: real("start_weight_kg").notNull(),
  targetWeightKg: real("target_weight_kg").notNull(),
  bodyFatPct: real("body_fat_pct"),
  aggressiveness: text("aggressiveness").notNull().default("extreme"),
  stepsGoal: integer("steps_goal").notNull().default(12000),
  waterGoalMl: integer("water_goal_ml").notNull().default(3000),
  dietaryPrefs: text("dietary_prefs"),
  allergies: text("allergies"),
  dislikedFoods: text("disliked_foods"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const weighIns = pgTable(
  "weigh_ins",
  {
    id: serial("id").primaryKey(),
    day: date("day").notNull(),
    weightKg: real("weight_kg").notNull(),
    // Exponentially smoothed weight. Stored rather than recomputed on every read
    // so the chart stays cheap; rebuilt from scratch whenever history is edited.
    trendKg: real("trend_kg").notNull(),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("weigh_ins_day_idx").on(t.day)],
);

/** One row per calendar day: goals frozen for that day, plus everything logged. */
export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: serial("id").primaryKey(),
    day: date("day").notNull(),
    steps: integer("steps").notNull().default(0),
    stepsGoal: integer("steps_goal").notNull(),
    // Targets are snapshotted per day so past days keep the goals they were
    // actually judged against, even after the auto-pilot changes them.
    kcalGoal: integer("kcal_goal").notNull(),
    proteinGoalG: integer("protein_goal_g").notNull(),
    fatGoalG: integer("fat_goal_g").notNull(),
    carbsGoalG: integer("carbs_goal_g").notNull(),
    waterMl: integer("water_ml").notNull().default(0),
    sleepHours: real("sleep_hours"),
    energyLevel: integer("energy_level"),
    hungerLevel: integer("hunger_level"),
    isRefeedDay: boolean("is_refeed_day").notNull().default(false),
    note: text("note"),
    stepsSyncedAt: timestamp("steps_synced_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("daily_logs_day_idx").on(t.day)],
);

/**
 * Food catalogue. Rows come from CIQUAL (raw and home-cooked French foods),
 * Open Food Facts (packaged products, by barcode), Gemini photo estimates, or
 * hand entry. All macros are per 100 g.
 */
export const foods = pgTable(
  "foods",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(),
    externalId: text("external_id"),
    barcode: text("barcode"),
    name: text("name").notNull(),
    /**
     * Lowercase, accent-stripped, punctuation-to-space version of the name.
     * Search runs against this so "oeuf" stops matching "boeuf" (word starts
     * become findable) and accents never have to be typed on a phone.
     */
    searchName: text("search_name").notNull().default(""),
    brand: text("brand"),
    kcal100: real("kcal_100").notNull(),
    protein100: real("protein_100").notNull(),
    fat100: real("fat_100").notNull(),
    carbs100: real("carbs_100").notNull(),
    fiber100: real("fiber_100"),
    defaultPortionG: real("default_portion_g").notNull().default(100),
    portionLabel: text("portion_label"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    useCount: integer("use_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("foods_search_name_idx").on(t.searchName),
    index("foods_barcode_idx").on(t.barcode),
    index("foods_use_count_idx").on(t.useCount),
  ],
);

/**
 * A logged food. Macros are COPIED here, never joined from the catalogue, so
 * correcting a food later never silently rewrites past days.
 */
export const foodEntries = pgTable(
  "food_entries",
  {
    id: serial("id").primaryKey(),
    day: date("day").notNull(),
    meal: text("meal").notNull(),
    foodId: integer("food_id").references(() => foods.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    quantityG: real("quantity_g").notNull(),
    kcal: real("kcal").notNull(),
    proteinG: real("protein_g").notNull(),
    fatG: real("fat_g").notNull(),
    carbsG: real("carbs_g").notNull(),
    photoUrl: text("photo_url"),
    aiEstimated: boolean("ai_estimated").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("food_entries_day_idx").on(t.day)],
);

/** What is actually in the fridge and cupboards, for the recipe generator. */
export const pantry = pgTable("pantry", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  category: text("category"),
  expiresOn: date("expires_on"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ingredients: jsonb("ingredients").notNull(),
  steps: jsonb("steps").notNull(),
  servings: integer("servings").notNull().default(1),
  kcalPerServing: real("kcal_per_serving").notNull(),
  proteinPerServing: real("protein_per_serving").notNull(),
  fatPerServing: real("fat_per_serving").notNull(),
  carbsPerServing: real("carbs_per_serving").notNull(),
  prepMinutes: integer("prep_minutes"),
  tags: jsonb("tags"),
  source: text("source").notNull().default("ai"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull(),
  plan: jsonb("plan").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shoppingItems = pgTable("shopping_items", {
  id: serial("id").primaryKey(),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  aisle: text("aisle"),
  checked: boolean("checked").notNull().default(false),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  equipment: text("equipment").notNull(),
  isCompound: boolean("is_compound").notNull().default(false),
  cues: text("cues"),
});

export const workoutTemplates = pgTable("workout_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dayLabel: text("day_label"),
  blocks: jsonb("blocks").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull().default(55),
});

export const workouts = pgTable(
  "workouts",
  {
    id: serial("id").primaryKey(),
    day: date("day").notNull(),
    templateId: integer("template_id").references(() => workoutTemplates.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    durationMinutes: integer("duration_minutes"),
    kcal: integer("kcal"),
    rating: integer("rating"),
    note: text("note"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("workouts_day_idx").on(t.day)],
);

/** Every set performed, which is what makes progressive overload visible. */
export const workoutSets = pgTable(
  "workout_sets",
  {
    id: serial("id").primaryKey(),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps").notNull(),
    weightKg: real("weight_kg"),
    rpe: real("rpe"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("workout_sets_exercise_idx").on(t.exerciseId)],
);

export const bodyMeasures = pgTable(
  "body_measures",
  {
    id: serial("id").primaryKey(),
    day: date("day").notNull(),
    waistCm: real("waist_cm"),
    chestCm: real("chest_cm"),
    armCm: real("arm_cm"),
    thighCm: real("thigh_cm"),
    hipsCm: real("hips_cm"),
  },
  (t) => [uniqueIndex("body_measures_day_idx").on(t.day)],
);

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDay: date("start_day").notNull(),
  endDay: date("end_day").notNull(),
  startWeightKg: real("start_weight_kg").notNull(),
  rules: jsonb("rules").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const challengeDays = pgTable(
  "challenge_days",
  {
    id: serial("id").primaryKey(),
    challengeId: integer("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    dayNumber: integer("day_number").notNull(),
    score: integer("score"),
    breakdown: jsonb("breakdown"),
  },
  (t) => [uniqueIndex("challenge_days_idx").on(t.challengeId, t.day)],
);

export const coachReports = pgTable("coach_reports", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull(),
  content: text("content").notNull(),
  actions: jsonb("actions"),
  adjustment: jsonb("adjustment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Progress photos, stored in the database as compressed JPEG data URLs.
 *
 * Object storage would be tidier, but it means another service to set up and
 * another token to keep alive, for a handful of ~120 KB images a week. They are
 * served through an API route so page HTML only ever carries ids, and the
 * browser can cache and lazy-load the images themselves.
 */
export const progressPhotos = pgTable(
  "progress_photos",
  {
    id: serial("id").primaryKey(),
    day: date("day").notNull(),
    imageData: text("image_data").notNull(),
    pose: text("pose").notNull().default("face"),
    weightKg: real("weight_kg"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("progress_photos_day_idx").on(t.day)],
);
