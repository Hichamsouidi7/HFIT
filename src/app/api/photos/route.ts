import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { progressPhotos } from "@/db/schema";
import { todayISO } from "@/lib/day";
import { getCurrentWeight, getProfile } from "@/lib/queries";

const POSES = ["face", "profil", "dos"];

export async function GET() {
  // Never selects image_data: a listing must stay small, the bytes are served
  // one at a time by the [id]/image route.
  const photos = await db
    .select({
      id: progressPhotos.id,
      day: progressPhotos.day,
      pose: progressPhotos.pose,
      weightKg: progressPhotos.weightKg,
      note: progressPhotos.note,
    })
    .from(progressPhotos)
    .orderBy(desc(progressPhotos.day), desc(progressPhotos.id));

  return NextResponse.json({ photos });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    image?: string;
    pose?: string;
    day?: string;
    note?: string;
  };

  const image = body.image ?? "";
  if (!image.startsWith("data:image/") || image.length < 200) {
    return NextResponse.json({ error: "Photo invalide." }, { status: 400 });
  }
  if (image.length > 3_000_000) {
    return NextResponse.json({ error: "Photo trop lourde." }, { status: 413 });
  }

  const profileRow = await getProfile();
  const weightKg = profileRow ? await getCurrentWeight(profileRow) : null;

  const [photo] = await db
    .insert(progressPhotos)
    .values({
      day: body.day ?? todayISO(),
      imageData: image,
      pose: POSES.includes(body.pose ?? "") ? body.pose! : "face",
      // Stamped at capture time so the timeline can show the weight that went
      // with each photo, even after the weight has moved on.
      weightKg,
      note: body.note?.trim() || null,
    })
    .returning({
      id: progressPhotos.id,
      day: progressPhotos.day,
      pose: progressPhotos.pose,
      weightKg: progressPhotos.weightKg,
    });

  return NextResponse.json({ ok: true, photo });
}
