CREATE TABLE "body_measures" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"waist_cm" real,
	"chest_cm" real,
	"arm_cm" real,
	"thigh_cm" real,
	"hips_cm" real
);
--> statement-breakpoint
CREATE TABLE "challenge_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenge_id" integer NOT NULL,
	"day" date NOT NULL,
	"day_number" integer NOT NULL,
	"score" integer,
	"breakdown" jsonb
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_day" date NOT NULL,
	"end_day" date NOT NULL,
	"start_weight_kg" real NOT NULL,
	"rules" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"content" text NOT NULL,
	"actions" jsonb,
	"adjustment" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"steps" integer DEFAULT 0 NOT NULL,
	"steps_goal" integer NOT NULL,
	"kcal_goal" integer NOT NULL,
	"protein_goal_g" integer NOT NULL,
	"fat_goal_g" integer NOT NULL,
	"carbs_goal_g" integer NOT NULL,
	"water_ml" integer DEFAULT 0 NOT NULL,
	"sleep_hours" real,
	"energy_level" integer,
	"hunger_level" integer,
	"is_refeed_day" boolean DEFAULT false NOT NULL,
	"note" text,
	"steps_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"muscle_group" text NOT NULL,
	"equipment" text NOT NULL,
	"is_compound" boolean DEFAULT false NOT NULL,
	"cues" text,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "food_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"meal" text NOT NULL,
	"food_id" integer,
	"name" text NOT NULL,
	"quantity_g" real NOT NULL,
	"kcal" real NOT NULL,
	"protein_g" real NOT NULL,
	"fat_g" real NOT NULL,
	"carbs_g" real NOT NULL,
	"photo_url" text,
	"ai_estimated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"external_id" text,
	"barcode" text,
	"name" text NOT NULL,
	"search_name" text DEFAULT '' NOT NULL,
	"brand" text,
	"kcal_100" real NOT NULL,
	"protein_100" real NOT NULL,
	"fat_100" real NOT NULL,
	"carbs_100" real NOT NULL,
	"fiber_100" real,
	"default_portion_g" real DEFAULT 100 NOT NULL,
	"portion_label" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"plan" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pantry" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"quantity" text,
	"category" text,
	"expires_on" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"sex" text DEFAULT 'male' NOT NULL,
	"age" integer NOT NULL,
	"height_cm" real NOT NULL,
	"start_weight_kg" real NOT NULL,
	"target_weight_kg" real NOT NULL,
	"body_fat_pct" real,
	"aggressiveness" text DEFAULT 'extreme' NOT NULL,
	"steps_goal" integer DEFAULT 12000 NOT NULL,
	"water_goal_ml" integer DEFAULT 3000 NOT NULL,
	"dietary_prefs" text,
	"allergies" text,
	"disliked_foods" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"url" text NOT NULL,
	"pose" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ingredients" jsonb NOT NULL,
	"steps" jsonb NOT NULL,
	"servings" integer DEFAULT 1 NOT NULL,
	"kcal_per_serving" real NOT NULL,
	"protein_per_serving" real NOT NULL,
	"fat_per_serving" real NOT NULL,
	"carbs_per_serving" real NOT NULL,
	"prep_minutes" integer,
	"tags" jsonb,
	"source" text DEFAULT 'ai' NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"meal_plan_id" integer,
	"name" text NOT NULL,
	"quantity" text,
	"aisle" text,
	"checked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weigh_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"weight_kg" real NOT NULL,
	"trend_kg" real NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"set_number" integer NOT NULL,
	"reps" integer NOT NULL,
	"weight_kg" real,
	"rpe" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"day_label" text,
	"blocks" jsonb NOT NULL,
	"estimated_minutes" integer DEFAULT 55 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"template_id" integer,
	"name" text NOT NULL,
	"duration_minutes" integer,
	"kcal" integer,
	"rating" integer,
	"note" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge_days" ADD CONSTRAINT "challenge_days_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "body_measures_day_idx" ON "body_measures" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_days_idx" ON "challenge_days" USING btree ("challenge_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_logs_day_idx" ON "daily_logs" USING btree ("day");--> statement-breakpoint
CREATE INDEX "food_entries_day_idx" ON "food_entries" USING btree ("day");--> statement-breakpoint
CREATE INDEX "foods_search_name_idx" ON "foods" USING btree ("search_name");--> statement-breakpoint
CREATE INDEX "foods_barcode_idx" ON "foods" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "foods_use_count_idx" ON "foods" USING btree ("use_count");--> statement-breakpoint
CREATE UNIQUE INDEX "weigh_ins_day_idx" ON "weigh_ins" USING btree ("day");--> statement-breakpoint
CREATE INDEX "workout_sets_exercise_idx" ON "workout_sets" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "workouts_day_idx" ON "workouts" USING btree ("day");