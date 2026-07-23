import { env } from "cloudflare:workers";
import { randomToken } from "@/lib/crypto";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function maxMenuImageBytes() {
  const mb = Number(process.env.MAX_MENU_IMAGE_SIZE_MB ?? "5");
  return (Number.isFinite(mb) && mb > 0 ? mb : 5) * 1024 * 1024;
}

export function publicUploadBaseUrl() {
  return (process.env.PUBLIC_UPLOAD_BASE_URL || "/uploads").replace(/\/$/, "");
}

function getUploadsBucket(): R2Bucket {
  const bucket = (env as { UPLOADS?: R2Bucket }).UPLOADS;
  if (!bucket) {
    throw new UploadError(
      "Upload storage is unavailable. Enable the R2 binding `UPLOADS` in .openai/hosting.json.",
      503,
    );
  }
  return bucket;
}

export async function storeMenuImage(file: File) {
  if (!file || file.size <= 0) {
    throw new UploadError("Empty or missing image file.");
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new UploadError("Unsupported image type. Use JPG, PNG or WebP.");
  }
  if (file.size > maxMenuImageBytes()) {
    throw new UploadError(
      `Image exceeds the maximum size of ${process.env.MAX_MENU_IMAGE_SIZE_MB || 5} MB.`,
    );
  }

  const ext = EXT_BY_MIME[file.type] || "bin";
  const storageKey = `menu-items/${randomToken(16)}.${ext}`;
  const bucket = getUploadsBucket();
  const bytes = await file.arrayBuffer();

  await bucket.put(storageKey, bytes, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      originalFilename: file.name.slice(0, 180),
    },
  });

  return {
    originalFilename: file.name.slice(0, 180),
    storageKey,
    imageUrl: `${publicUploadBaseUrl()}/${storageKey}`,
    mimeType: file.type,
    fileSize: file.size,
  };
}

export async function deleteStoredObject(storageKey: string) {
  if (!storageKey || storageKey.includes("..")) return;
  try {
    const bucket = getUploadsBucket();
    await bucket.delete(storageKey);
  } catch {
    // Ignore missing binding/object during cleanup
  }
}
