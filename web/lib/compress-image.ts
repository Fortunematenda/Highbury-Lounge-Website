/**
 * Client-side image compression via canvas.
 * Resizes to fit within maxDimension and re-encodes as JPEG at the given
 * quality. Returns a File suitable for FormData upload.
 */

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.75;
const DEFAULT_MAX_BYTES = 700 * 1024; // 700 KB — keep multipart body under wrangler dev 1 MB limit

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      type,
      quality,
    );
  });
}

export async function compressImage(
  file: File,
  options?: { maxDimension?: number; quality?: number; maxBytes?: number },
): Promise<File> {
  const maxDim = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;

  // Skip if already small enough
  if (file.size <= maxBytes) return file;

  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  const img = await loadImage(file);
  let { width, height } = img;

  // Scale down to fit within maxDimension
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  // Try WebP first, fall back to JPEG
  let blob: Blob;
  let ext: string;
  try {
    blob = await canvasToBlob(canvas, "image/webp", quality);
    ext = "webp";
    // Some browsers produce empty or oversized WebP — fall back
    if (!blob.size) throw new Error("empty");
  } catch {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    ext = "jpg";
  }

  // If still too large, reduce quality iteratively
  let q = quality - 0.1;
  while (blob.size > maxBytes && q > 0.3) {
    blob = await canvasToBlob(canvas, `image/${ext === "webp" ? "webp" : "jpeg"}`, q);
    q -= 0.1;
  }

  const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
  return new File([blob], name, { type: blob.type, lastModified: Date.now() });
}
