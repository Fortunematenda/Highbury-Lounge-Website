import { env } from "cloudflare:workers";
import { jsonError } from "@/lib/format";

function getUploadsBucket(): R2Bucket {
  const bucket = (env as { UPLOADS?: R2Bucket }).UPLOADS;
  if (!bucket) {
    throw new Error("Upload storage is unavailable.");
  }
  return bucket;
}

function normalizeKey(path: string[]) {
  const key = path.filter(Boolean).join("/").replace(/^\/+|\/+$/g, "");
  if (!key || key.includes("..") || key.startsWith("/")) {
    return null;
  }
  return key;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = normalizeKey(path);
  if (!key) return jsonError("Not found.", 404);

  try {
    const bucket = getUploadsBucket();
    const object = await bucket.get(key);
    if (!object) return jsonError("Not found.", 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Accept-Ranges", "bytes");
    if (object.size) headers.set("Content-Length", String(object.size));

    return new Response(object.body, { headers });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("unavailable")) {
      return jsonError("Upload storage unavailable.", 503);
    }
    return jsonError("Unable to serve file.", 500);
  }
}

export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = normalizeKey(path);
  if (!key) return jsonError("Not found.", 404);

  try {
    const bucket = getUploadsBucket();
    const object = await bucket.head(key);
    if (!object) return jsonError("Not found.", 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Accept-Ranges", "bytes");
    if (object.size) headers.set("Content-Length", String(object.size));

    return new Response(null, { headers });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("unavailable")) {
      return jsonError("Upload storage unavailable.", 503);
    }
    return jsonError("Unable to serve file.", 500);
  }
}
