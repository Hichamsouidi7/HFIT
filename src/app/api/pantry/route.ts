import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { pantry } from "@/db/schema";

export async function GET() {
  const items = await db.select().from(pantry).orderBy(asc(pantry.category), asc(pantry.name));
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    quantity?: string;
    category?: string;
    names?: string[];
  };

  // Accepts either one item or a batch, because stocking the fridge for the
  // first time is a dozen items typed in one go, not one form submission each.
  const names = body.names?.length
    ? body.names
    : body.name
      ? [body.name]
      : [];

  const values = names
    .map((n) => n.trim())
    .filter((n) => n.length > 1)
    .map((name) => ({
      name,
      quantity: names.length === 1 ? (body.quantity?.trim() || null) : null,
      category: body.category?.trim() || null,
    }));

  if (values.length === 0) {
    return NextResponse.json({ error: "Rien à ajouter." }, { status: 400 });
  }

  const items = await db.insert(pantry).values(values).returning();
  return NextResponse.json({ ok: true, items });
}
