import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  bodyMeasures,
  challenges,
  dailyLogs,
  foodEntries,
  pantry,
  profile,
  recipes,
  weighIns,
  workoutSets,
  workouts,
} from "@/db/schema";
import { todayISO } from "@/lib/day";

/**
 * Full data export.
 *
 * Everything he logged is his; a personal app with no export is a trap. Photos
 * are deliberately excluded — they would turn a small JSON file into tens of
 * megabytes, and they can be saved from the photos screen directly.
 */
export async function GET() {
  const [
    profileRows,
    weighInRows,
    logRows,
    entryRows,
    workoutRows,
    setRows,
    measureRows,
    challengeRows,
    recipeRows,
    pantryRows,
  ] = await Promise.all([
    db.select().from(profile),
    db.select().from(weighIns),
    db.select().from(dailyLogs),
    db.select().from(foodEntries),
    db.select().from(workouts),
    db.select().from(workoutSets),
    db.select().from(bodyMeasures),
    db.select().from(challenges),
    db.select().from(recipes),
    db.select().from(pantry),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    app: "HFit",
    profile: profileRows[0] ?? null,
    weighIns: weighInRows,
    dailyLogs: logRows,
    foodEntries: entryRows,
    workouts: workoutRows,
    workoutSets: setRows,
    bodyMeasures: measureRows,
    challenges: challengeRows,
    recipes: recipeRows,
    pantry: pantryRows,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="hfit-${todayISO()}.json"`,
    },
  });
}
