import { eq, sql } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { galleryImages } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import {
  deleteStoredObject,
  storageKeyFromUploadUrl,
} from "@/lib/uploads";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid id.", 400);

    const body = await request.json();
    const db = getDb();
    const [existing] = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.id, id))
      .limit(1);
    if (!existing) return jsonError("Image not found.", 404);

    const [row] = await db
      .update(galleryImages)
      .set({
        altText:
          body.altText !== undefined
            ? String(body.altText || "") || null
            : existing.altText,
        displayOrder:
          body.displayOrder != null
            ? Number(body.displayOrder)
            : existing.displayOrder,
        isActive:
          body.isActive !== undefined
            ? Boolean(body.isActive)
            : existing.isActive,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(galleryImages.id, id))
      .returning();

    await writeAuditLog({
      adminUserId: user.id,
      action: "gallery.image_updated",
      entityType: "gallery_image",
      entityId: id,
    });

    return Response.json({ ok: true, image: row });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Could not update gallery image.", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid id.", 400);

    const db = getDb();
    const [existing] = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.id, id))
      .limit(1);
    if (!existing) return jsonError("Image not found.", 404);

    await db.delete(galleryImages).where(eq(galleryImages.id, id));
    const key = storageKeyFromUploadUrl(existing.imageUrl);
    if (key) await deleteStoredObject(key);

    await writeAuditLog({
      adminUserId: user.id,
      action: "gallery.image_deleted",
      entityType: "gallery_image",
      entityId: id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Could not delete gallery image.", 500);
  }
}
