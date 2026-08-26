import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { progressPhotos } from "@/db/schema";
import { BottomNav } from "@/components/BottomNav";
import { ProgressPhotos } from "@/components/ProgressPhotos";
import { PageHeader } from "@/components/ui";
import { getProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

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

  return (
    <>
      <main className="mx-auto max-w-md px-5">
        <PageHeader
          title="Photos"
          subtitle="Ce que la balance ne montre pas."
          back="/progres"
        />
        <div className="mt-6">
          <ProgressPhotos initial={photos} />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
