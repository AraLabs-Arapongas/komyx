/**
 * Shrinks a photo in the browser before upload: longest side capped (default 1600 px) and
 * re-encoded as JPEG (or WebP when the source was WebP). A 5 MB phone photo becomes ~300 KB.
 * Returns the original file when it is already small or when the browser cannot decode it.
 */
export async function compressImage(file: File, { maxSide = 1600, quality = 0.85, minBytes = 400 * 1024 } = {}): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size <= minBytes) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const type = file.type === "image/webp" ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + (type === "image/webp" ? ".webp" : ".jpg");
    return new File([blob], name, { type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
