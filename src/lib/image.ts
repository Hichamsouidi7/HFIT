/**
 * Client-side image handling.
 *
 * Phone photos are 3-5 MB. Sending that to the API wastes the user's data and
 * the model's token budget for no gain in accuracy, so every image is scaled
 * down and re-encoded before it leaves the device.
 */

export interface CompressedImage {
  /** data: URL, ready to preview or POST. */
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  { maxSize = 1280, quality = 0.72 }: { maxSize?: number; quality?: number } = {},
): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return {
    dataUrl: canvas.toDataURL("image/jpeg", quality),
    mimeType: "image/jpeg",
    width,
    height,
  };
}

/** Rough byte size of a data: URL, for size checks before upload. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}
