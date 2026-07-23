import { count, eq, sql } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { menuCategories, menuItems } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { isMenuItemType } from "@/lib/menu-constants";
import { normalizeTranslationsJson } from "@/lib/i18n/content";
import { slugify } from "@/lib/slug";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid category id.", 400);

    const body = await request.json();
    const db = getDb();
    const [existing] = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.id, id))
      .limit(1);
    if (!existing) return jsonError("Category not found.", 404);

    if (body.action === "archive") {
      await db
        .update(menuCategories)
        .set({
          archivedAt: new Date().toISOString(),
          isActive: false,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(menuCategories.id, id));
      await writeAuditLog({
        adminUserId: user.id,
        action: "menu.category_archived",
        entityType: "menu_category",
        entityId: id,
      });
      return Response.json({ ok: true });
    }

    if (body.action === "restore") {
      await db
        .update(menuCategories)
        .set({
          archivedAt: null,
          isActive: true,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(menuCategories.id, id));
      await writeAuditLog({
        adminUserId: user.id,
        action: "menu.category_restored",
        entityType: "menu_category",
        entityId: id,
      });
      return Response.json({ ok: true });
    }

    if (body.action === "reorder") {
      await db
        .update(menuCategories)
        .set({
          displayOrder: Number(body.displayOrder ?? existing.displayOrder),
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(menuCategories.id, id));
      return Response.json({ ok: true });
    }

    const name =
      body.name != null ? String(body.name).trim() : existing.name;
    if (!name) return jsonError("Category name is required.", 400);
    const itemType = body.itemType
      ? String(body.itemType)
      : existing.itemType;
    if (!isMenuItemType(itemType)) return jsonError("Invalid item type.", 400);
    const slug =
      body.slug != null
        ? String(body.slug).trim() || slugify(name)
        : existing.slug;

    const [row] = await db
      .update(menuCategories)
      .set({
        name,
        slug,
        description:
          body.description !== undefined
            ? String(body.description || "") || null
            : existing.description,
        imageUrl:
          body.imageUrl !== undefined
            ? String(body.imageUrl || "") || null
            : existing.imageUrl,
        itemType,
        displayOrder:
          body.displayOrder != null
            ? Number(body.displayOrder)
            : existing.displayOrder,
        isActive:
          body.isActive !== undefined
            ? Boolean(body.isActive)
            : existing.isActive,
        translationsJson:
          body.translationsJson !== undefined
            ? (normalizeTranslationsJson(body.translationsJson) ?? null)
            : existing.translationsJson,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(menuCategories.id, id))
      .returning();

    await writeAuditLog({
      adminUserId: user.id,
      action: "menu.category_updated",
      entityType: "menu_category",
      entityId: id,
      details: { name, slug },
    });

    return Response.json({ ok: true, category: row });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Could not update category.", 500);
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

    const [usage] = await db
      .select({ total: count() })
      .from(menuItems)
      .where(eq(menuItems.categoryId, id));
    if ((usage?.total ?? 0) > 0) {
      return jsonError(
        "Cannot delete a category that still has menu items. Move or archive items first.",
        409,
      );
    }

    await db.delete(menuCategories).where(eq(menuCategories.id, id));
    await writeAuditLog({
      adminUserId: user.id,
      action: "menu.category_deleted",
      entityType: "menu_category",
      entityId: id,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Could not delete category.", 500);
  }
}
