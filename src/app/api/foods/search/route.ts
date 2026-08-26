import { NextResponse } from "next/server";
import { recentFoods, searchFoods } from "@/lib/queries";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const foods = q.trim().length >= 2 ? await searchFoods(q) : await recentFoods();
  return NextResponse.json({ foods });
}
