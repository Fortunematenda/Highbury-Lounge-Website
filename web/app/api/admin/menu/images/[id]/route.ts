import { eq, sql } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { menuItemImages, menuItems } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { deleteStoredObject } from "@/lib/uploads";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);
    const id = Number((await context.params).id);
    const body = await request.json();
    const db = getDb();
    const [image] = await db
      .select()
      .from(menuItemImages)
      .where(eq(menuItemImages.id, id))
      .limit(1);
    if (!image) return jsonError("Image not found.", 404);

    if (body.action === "feature") {
      await db
        .update(menuItemImages)
        .set({ isFeatured: false })
        .where(eq(menuItemImages.menuItemId, image.menuItemId));
      await db
        .update(menuItemImages)
        .set({ isFeatured: true })
        .where(eq(menuItemImages.id, id));
      await db
        .update(menuItems)
        .set({
          imageUrl: image.imageUrl,
          updatedById: user.id,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(menuItems.id, image.menuItemId));
      await writeAuditLog({
        adminUserId: user.id,
        action: "menu.featured_image_set",
        entityType: "menu_item",
        entityId: image.menuItemId,
        details: { imageId: id },
      });
      return Response.json({ ok: true });
    }

    if (body.displayOrder != null) {
      await db
        .update(menuItemImages)
        .set({ displayOrder: Number(body.displayOrder) })
        .where(eq(menuItemImages.id, id));
      return Response.json({ ok: true });
    }

    return jsonError("Unsupported action.", 400);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
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
    const id = Number((await context.params).id);
    const db = getDb();
    const [image] = await db
      .select()
      .from(menuItemImages)
      .where(eq(menuItemImages.id, id))
      .limit(1);
    if (!image) return jsonError("Image not found.", 404);

    await db.delete(menuItemImages).where(eq(menuItemImages.id, id));
    await deleteStoredObject(image.storageKey);

    if (image.isFeatured) {
      const [next] = await db
        .select()
        .from(menuItemImages)
        .where(eq(menuItemImages.menuItemId, image.menuItemId))
        .limit(1);
      await db
        .update(menuItems)
        .set({
          imageUrl: next?.imageUrl ?? null,
          updatedById: user.id,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(menuItems.id, image.menuItemId));
      if (next) {
        await db
          .update(menuItemImages)
          .set({ isFeatured: true })
          .where(eq(menuItemImages.id, next.id));
      }
    }

    await writeAuditLog({
      adminUserId: user.id,
      action: "menu.image_removed",
      entityType: "menu_item",
      entityId: image.menuItemId,
      details: { imageId: id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Could not remove image.", 500);
  }
}
