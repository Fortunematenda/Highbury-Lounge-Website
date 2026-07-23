import { asc, isNull } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { menuCategories } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { isMenuItemType } from "@/lib/menu-constants";
import { normalizeTranslationsJson } from "@/lib/i18n/content";
import { slugify } from "@/lib/slug";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const includeArchived =
      new URL(request.url).searchParams.get("archived") === "1";
    const db = getDb();
    const rows = await db
      .select()
      .from(menuCategories)
      .where(includeArchived ? undefined : isNull(menuCategories.archivedAt))
      .orderBy(asc(menuCategories.displayOrder), asc(menuCategories.name));
    return Response.json({ categories: rows });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Failed to load categories.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) return jsonError("Category name is required.", 400);
    const itemType = String(body.itemType ?? "food");
    if (!isMenuItemType(itemType)) return jsonError("Invalid item type.", 400);
    const slug = String(body.slug ?? "").trim() || slugify(name);

    const db = getDb();
    const [row] = await db
      .insert(menuCategories)
      .values({
        name,
        slug,
        description: body.description ? String(body.description) : null,
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        itemType,
        displayOrder: Number(body.displayOrder ?? 0),
        isActive: body.isActive !== false && body.isActive !== "false",
        translationsJson:
          normalizeTranslationsJson(body.translationsJson) ?? null,
      })
      .returning();

    await writeAuditLog({
      adminUserId: user.id,
      action: "menu.category_created",
      entityType: "menu_category",
      entityId: row.id,
      details: { name, slug },
    });

    return Response.json({ ok: true, category: row }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) {
      return jsonError("Category name or slug already exists.", 409);
    }
    return jsonError("Could not create category.", 500);
  }
}
