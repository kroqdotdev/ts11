export type ImagePurpose = "crest" | "photo" | "feature" | "sponsor";

/** Why an image could not be used; the interface words it (`ui.image.<code>`). */
export class ImageError extends Error {
  constructor(readonly code: "notImage" | "unreadableFile" | "unreadable" | "noCanvas") {
    super(code);
    this.name = "ImageError";
  }
}

const LIMITS: Record<ImagePurpose, number> = {
  crest: 512,
  sponsor: 640,
  feature: 1400,
  photo: 1920,
};

/**
 * Reads an uploaded image and downsizes it so it fits comfortably in localStorage.
 * Photos become JPEG; anything that may need transparency stays WebP (PNG where unsupported).
 */
export async function readImage(file: File, purpose: ImagePurpose): Promise<string> {
  if (!file.type.startsWith("image/")) throw new ImageError("notImage");
  if (file.type === "image/svg+xml") {
    // SVG crests are small and scale perfectly; keep them as-is.
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new ImageError("unreadableFile"));
      reader.readAsDataURL(file);
    });
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new ImageError("unreadable");
  });
  const max = LIMITS[purpose];
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("noCanvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  if (purpose === "photo") return canvas.toDataURL("image/jpeg", 0.84);
  const webp = canvas.toDataURL("image/webp", 0.9);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}
