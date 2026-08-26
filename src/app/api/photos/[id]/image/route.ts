import { eq } from "drizzle-orm";
import { db } from "@/db";
import { progressPhotos } from "@/db/schema";

/**
 * Serves one photo as real image bytes.
 *
 * Keeps the data URL out of the page HTML: the browser can then lazy-load and
 * cache each image, which is what makes a timeline of dozens of photos usable
 * on a phone connection.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId)) return new Response("Not found", { status: 404 });

  const [photo] = await db
    .select({ imageData: progressPhotos.imageData })
    .from(progressPhotos)
    .where(eq(progressPhotos.id, photoId))
    .limit(1);

  if (!photo) return new Response("Not found", { status: 404 });

  // Split rather than a dot-all regex: the payload is one very long line and
  // the /s flag needs a newer compile target than this project uses.
  const separator = photo.imageData.indexOf(";base64,");
  if (separator === -1 || !photo.imageData.startsWith("data:image/")) {
    return new Response("Not found", { status: 404 });
  }

  const mimeType = photo.imageData.slice("data:".length, separator);
  const base64 = photo.imageData.slice(separator + ";base64,".length);

  return new Response(Buffer.from(base64, "base64"), {
    headers: {
      "Content-Type": mimeType,
      // The bytes for a given id never change, and the whole app is behind a
      // password, so this is a private cache only.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
