import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes } from "@/db/schema";

export async function GET(request: Request) {
  const favoritesOnly = new URL(request.url).searchParams.get("favorites") === "1";

  const rows = await db
    .select()
    .from(recipes)
    .where(favoritesOnly ? eq(recipes.isFavorite, true) : undefined)
    .orderBy(desc(recipes.isFavorite), desc(recipes.createdAt))
    .limit(60);

  return NextResponse.json({ recipes: rows });
}
