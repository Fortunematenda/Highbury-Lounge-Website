/**
 * Client-side image compression via canvas.
 * Resizes to fit within maxDimension and re-encodes as JPEG/WebP.
 * Returns a File suitable for FormData upload.
 */

const DEFAULT_MAX_DIMENSION = 960;
const DEFAULT_QUALITY = 0.55;
const DEFAULT_MAX_BYTES = 250 * 1024; // 250 KB — keep multipart body well under wrangler dev 1 MB limit

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function fileExtension(name: string) {
  const match = /\.([^.]+)$/.exec(name);
  return match?.[1]?.toLowerCase() ?? "";
}

function guessedMime(file: File) {
  if (file.type) return file.type.toLowerCase();
  return MIME_BY_EXT[fileExtension(file.name)] || "";
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Could not read this image. On iPhone, try choosing a photo as JPG, or take a new photo and upload that.",
        ),
      );
    };
    img.src = url;
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

function withMime(file: File, mime: string): File {
  if (!mime || file.type === mime) return file;
  return new File([file], file.name, {
    type: mime,
    lastModified: file.lastModified,
  });
}

export async function compressImage(
  file: File,
  options?: { maxDimension?: number; quality?: number; maxBytes?: number },
): Promise<File> {
  const maxDim = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const mime = guessedMime(file);

  if (mime && !mime.startsWith("image/")) {
    throw new Error("Please choose a JPG, PNG, or WebP image.");
  }

  const allowedMime = ALLOWED_MIME.has(mime);
  // Already small + allowed MIME (normalize empty/odd phone MIME via guess)
  if (file.size <= maxBytes && allowedMime) {
    return withMime(file, mime);
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch (err) {
    // Decode failed (common for HEIC on non-Safari). If the file is already
    // an allowed type, send the original; otherwise surface a clear error.
    if (allowedMime) return withMime(file, mime);
    throw err;
  }

  let { width, height } = img;

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

  // Try WebP first, fall back to JPEG
  let blob: Blob;
  let ext: string;
  try {
    blob = await canvasToBlob(canvas, "image/webp", quality);
    ext = "webp";
    if (!blob.size) throw new Error("empty");
  } catch {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    ext = "jpg";
  }

  let q = Math.max(0.05, quality - 0.05);
  while (blob.size > maxBytes && q >= 0.05) {
    blob = await canvasToBlob(
      canvas,
      `image/${ext === "webp" ? "webp" : "jpeg"}`,
      q,
    );
    q -= 0.05;
  }

  const name = file.name.replace(/\.[^.]+$/, `.${ext}`) || `image.${ext}`;
  return new File([blob], name, { type: blob.type, lastModified: Date.now() });
}
