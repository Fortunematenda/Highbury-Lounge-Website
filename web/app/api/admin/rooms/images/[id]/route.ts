import { asc, eq, sql } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { roomImages, roomTypes } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { deleteStoredObject, storageKeyFromUploadUrl } from "@/lib/uploads";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);

    const imageId = Number((await context.params).id);
    if (!Number.isFinite(imageId)) return jsonError("Invalid image id.", 400);

    const body = await request.json();
    const db = getDb();
    const [image] = await db
      .select()
      .from(roomImages)
      .where(eq(roomImages.id, imageId))
      .limit(1);
    if (!image) return jsonError("Image not found.", 404);

    if (body.action === "feature") {
      await db
        .update(roomTypes)
        .set({
          featuredImage: image.url,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(roomTypes.id, image.roomTypeId));

      await writeAuditLog({
        adminUserId: user.id,
        action: "room.featured_image_set",
        entityType: "room_type",
        entityId: image.roomTypeId,
        details: { imageId },
      });

      return Response.json({ ok: true, featuredImage: image.url });
    }

    if (body.displayOrder != null) {
      await db
        .update(roomImages)
        .set({ displayOrder: Number(body.displayOrder) })
        .where(eq(roomImages.id, imageId));
      return Response.json({ ok: true });
    }

    return jsonError("Unsupported action.", 400);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not update image.", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);

    const imageId = Number((await context.params).id);
    if (!Number.isFinite(imageId)) return jsonError("Invalid image id.", 400);

    const db = getDb();
    const [image] = await db
      .select()
      .from(roomImages)
      .where(eq(roomImages.id, imageId))
      .limit(1);
    if (!image) return jsonError("Image not found.", 404);

    const [room] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, image.roomTypeId))
      .limit(1);

    await db.delete(roomImages).where(eq(roomImages.id, imageId));

    const key = storageKeyFromUploadUrl(image.url);
    if (key) await deleteStoredObject(key);

    const remaining = await db
      .select()
      .from(roomImages)
      .where(eq(roomImages.roomTypeId, image.roomTypeId))
      .orderBy(asc(roomImages.displayOrder), asc(roomImages.id));

    const wasFeatured = room?.featuredImage === image.url;
    let featuredImage = room?.featuredImage ?? null;
    if (wasFeatured) {
      featuredImage = remaining[0]?.url ?? null;
      await db
        .update(roomTypes)
        .set({
          featuredImage,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(roomTypes.id, image.roomTypeId));
    }

    await writeAuditLog({
      adminUserId: user.id,
      action: "room.image_removed",
      entityType: "room_type",
      entityId: image.roomTypeId,
      details: { imageId },
    });

    return Response.json({ ok: true, images: remaining, featuredImage });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not remove image.", 500);
  }
}
