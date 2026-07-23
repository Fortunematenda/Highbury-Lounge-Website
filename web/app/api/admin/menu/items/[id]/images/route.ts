import { asc, eq, sql } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { menuItemImages, menuItems } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { storeMenuImage, UploadError } from "@/lib/uploads";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);
    const menuItemId = Number((await context.params).id);
    if (!Number.isFinite(menuItemId)) return jsonError("Invalid item id.", 400);

    const db = getDb();
    const [item] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, menuItemId))
      .limit(1);
    if (!item) return jsonError("Menu item not found.", 404);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Image file is required.", 400);
    const altText = String(form.get("altText") ?? "").trim() || null;
    const featured = String(form.get("featured") ?? "") === "1";

    const stored = await storeMenuImage(file);
    const existing = await db
      .select()
      .from(menuItemImages)
      .where(eq(menuItemImages.menuItemId, menuItemId))
      .orderBy(asc(menuItemImages.displayOrder));

    if (featured || existing.length === 0) {
      await db
        .update(menuItemImages)
        .set({ isFeatured: false })
        .where(eq(menuItemImages.menuItemId, menuItemId));
    }

    const [image] = await db
      .insert(menuItemImages)
      .values({
        menuItemId,
        originalFilename: stored.originalFilename,
        storageKey: stored.storageKey,
        imageUrl: stored.imageUrl,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        altText,
        displayOrder: existing.length,
        isFeatured: featured || existing.length === 0,
      })
      .returning();

    if (image.isFeatured) {
      await db
        .update(menuItems)
        .set({
          imageUrl: image.imageUrl,
          updatedById: user.id,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(menuItems.id, menuItemId));
    }

    await writeAuditLog({
      adminUserId: user.id,
      action: "menu.image_uploaded",
      entityType: "menu_item",
      entityId: menuItemId,
      details: { imageId: image.id, storageKey: image.storageKey },
    });

    return Response.json({ ok: true, image }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof UploadError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Image upload failed.", 500);
  }
}
