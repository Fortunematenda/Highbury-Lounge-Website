import { and, eq, isNull, sql } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import {
  deleteStoredObject,
  storageKeyFromUploadUrl,
  storeUploadedImage,
  UploadError,
} from "@/lib/uploads";

export function GET() {
  return jsonError("Use POST to upload an image.", 405);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    const id = Number((await params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid event id.", 400);

    const db = getDb();
    const [existing] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), isNull(events.deletedAt)))
      .limit(1);
    if (!existing) return jsonError("Event not found.", 404);

    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "cover");
    if (!(file instanceof File)) return jsonError("Image file is required.", 400);
    if (!["cover", "poster", "gallery", "social"].includes(kind)) {
      return jsonError("Invalid image kind.", 400);
    }

    const uploaded = await storeUploadedImage(file, "events");
    const patch: Record<string, unknown> = {
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    if (kind === "cover") {
      // Single event image is used as cover, poster and social.
      for (const field of ["coverImage", "posterImage", "socialImage"] as const) {
        const oldKey = storageKeyFromUploadUrl(existing[field]);
        patch[field] = uploaded.imageUrl;
        if (oldKey && oldKey !== storageKeyFromUploadUrl(uploaded.imageUrl)) {
          await deleteStoredObject(oldKey);
        }
      }
    } else if (kind === "poster") {
      const oldKey = storageKeyFromUploadUrl(existing.posterImage);
      patch.posterImage = uploaded.imageUrl;
      if (oldKey) await deleteStoredObject(oldKey);
    } else if (kind === "social") {
      const oldKey = storageKeyFromUploadUrl(existing.socialImage);
      patch.socialImage = uploaded.imageUrl;
      if (oldKey) await deleteStoredObject(oldKey);
    } else {
      let gallery: string[] = [];
      try {
        gallery = existing.galleryJson
          ? (JSON.parse(existing.galleryJson) as string[])
          : [];
      } catch {
        gallery = [];
      }
      if (!Array.isArray(gallery)) gallery = [];
      gallery.push(uploaded.imageUrl);
      patch.galleryJson = JSON.stringify(gallery);
    }

    const [row] = await db
      .update(events)
      .set(patch)
      .where(eq(events.id, id))
      .returning();

    await writeAuditLog({
      adminUserId: user.id,
      action: "event.image",
      entityType: "event",
      entityId: id,
      details: { kind, imageUrl: uploaded.imageUrl },
    });

    return Response.json({ ok: true, event: row, imageUrl: uploaded.imageUrl });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof UploadError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Unable to upload image.", 500);
  }
}
