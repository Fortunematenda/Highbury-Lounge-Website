import { and, asc, desc, eq, isNotNull, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { menuCategories, menuItemImages, menuItems } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import {
  isMenuItemType,
  isPriceUnit,
} from "@/lib/menu-constants";
import { normalizeTranslationsJson } from "@/lib/i18n/content";
import { slugify } from "@/lib/slug";

function parseBool(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === "on") return true;
  if (value === "false" || value === "0") return false;
  return Boolean(value);
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const sp = new URL(request.url).searchParams;
    const q = (sp.get("q") ?? "").trim();
    const categoryId = sp.get("categoryId");
    const itemType = sp.get("itemType");
    const status = sp.get("status"); // active|inactive
    const availability = sp.get("availability"); // available|unavailable
    const featured = sp.get("featured");
    const archived = sp.get("archived") === "1";
    const sort = sp.get("sort") ?? "displayOrder";
    const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(1, Number(sp.get("pageSize") ?? "20") || 20));

    const filters: SQL[] = [];
    if (archived) filters.push(isNotNull(menuItems.archivedAt));
    else filters.push(isNull(menuItems.archivedAt));
    if (categoryId) filters.push(eq(menuItems.categoryId, Number(categoryId)));
    if (itemType) filters.push(eq(menuItems.itemType, itemType));
    if (status === "active") filters.push(eq(menuItems.isActive, true));
    if (status === "inactive") filters.push(eq(menuItems.isActive, false));
    if (availability === "available") filters.push(eq(menuItems.isAvailable, true));
    if (availability === "unavailable") filters.push(eq(menuItems.isAvailable, false));
    if (featured === "1") filters.push(eq(menuItems.isFeatured, true));
    if (featured === "0") filters.push(eq(menuItems.isFeatured, false));
    if (q) {
      const pattern = `%${q}%`;
      filters.push(
        or(
          like(menuItems.name, pattern),
          like(menuItems.description, pattern),
          like(menuItems.shortDescription, pattern),
          like(menuItems.sku, pattern),
          like(menuItems.tags, pattern),
          like(menuCategories.name, pattern),
        )!,
      );
    }

    const db = getDb();
    const orderBy =
      sort === "name"
        ? asc(menuItems.name)
        : sort === "price"
          ? asc(menuItems.price)
          : sort === "updated"
            ? desc(menuItems.updatedAt)
            : sort === "created"
              ? desc(menuItems.createdAt)
              : asc(menuItems.displayOrder);

    const rows = await db
      .select({
        item: menuItems,
        categoryName: menuCategories.name,
      })
      .from(menuItems)
      .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const images = await db.select().from(menuItemImages);
    const byItem = new Map<number, typeof images>();
    for (const img of images) {
      const list = byItem.get(img.menuItemId) ?? [];
      list.push(img);
      byItem.set(img.menuItemId, list);
    }

    return Response.json({
      items: rows.map(({ item, categoryName }) => ({
        ...item,
        categoryName,
        images: (byItem.get(item.id) ?? []).sort(
          (a, b) => a.displayOrder - b.displayOrder,
        ),
      })),
      page,
      pageSize,
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Failed to load menu items.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const categoryId = Number(body.categoryId);
    const itemType = String(body.itemType ?? "food");
    const price = Number(body.price ?? body.standardPrice);
    const currency = String(body.currency ?? "USD").trim() || "USD";
    const priceUnit = String(body.priceUnit ?? "per_item");
    const promotionalPrice =
      body.promotionalPrice != null && body.promotionalPrice !== ""
        ? Number(body.promotionalPrice)
        : null;

    if (!name) return jsonError("Item name is required.", 400);
    if (!Number.isFinite(categoryId)) return jsonError("Category is required.", 400);
    if (!isMenuItemType(itemType)) return jsonError("Invalid item type.", 400);
    if (!Number.isFinite(price) || price < 0) {
      return jsonError("Standard price must be zero or greater.", 400);
    }
    if (promotionalPrice != null && (promotionalPrice < 0 || promotionalPrice >= price)) {
      return jsonError("Promotional price must be lower than the standard price.", 400);
    }
    if (!isPriceUnit(priceUnit)) return jsonError("Invalid price unit.", 400);

    const slug = String(body.slug ?? "").trim() || slugify(name);
    const db = getDb();

    const [row] = await db
      .insert(menuItems)
      .values({
        name,
        slug,
        sku: body.sku ? String(body.sku).trim() : null,
        categoryId,
        itemType,
        shortDescription: body.shortDescription
          ? String(body.shortDescription)
          : null,
        description: body.description ? String(body.description) : null,
        price,
        promotionalPrice,
        currency,
        priceUnit,
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        tags: body.tags ? String(body.tags) : null,
        quantityAvailable:
          body.quantityAvailable != null && body.quantityAvailable !== ""
            ? Number(body.quantityAvailable)
            : null,
        preparationTimeMinutes:
          body.preparationTimeMinutes != null && body.preparationTimeMinutes !== ""
            ? Number(body.preparationTimeMinutes)
            : null,
        availableFrom: body.availableFrom || null,
        availableUntil: body.availableUntil || null,
        isActive: parseBool(body.isActive, true),
        isAvailable: parseBool(body.isAvailable, true),
        isFeatured: parseBool(body.isFeatured, false),
        allowPreOrder: parseBool(body.allowPreOrder, true),
        allowRoomBooking: parseBool(body.allowRoomBooking, false),
        allowConferenceBooking: parseBool(body.allowConferenceBooking, false),
        isVegetarian: parseBool(body.isVegetarian, false),
        isVegan: parseBool(body.isVegan, false),
        isHalal: parseBool(body.isHalal, false),
        isGlutenFree: parseBool(body.isGlutenFree, false),
        containsNuts: parseBool(body.containsNuts, false),
        isSpicy: parseBool(body.isSpicy, false),
        allergens: body.allergens ? String(body.allergens) : null,
        ingredients: body.ingredients ? String(body.ingredients) : null,
        servingSize: body.servingSize ? String(body.servingSize) : null,
        displayOrder: Number(body.displayOrder ?? 0),
        publicVisible: parseBool(body.publicVisible, true),
        adminNotes: body.adminNotes ? String(body.adminNotes) : null,
        translationsJson:
          normalizeTranslationsJson(body.translationsJson) ?? null,
        createdById: user.id,
        updatedById: user.id,
      })
      .returning();

    await writeAuditLog({
      adminUserId: user.id,
      action: "menu.item_created",
      entityType: "menu_item",
      entityId: row.id,
      details: { name, price, categoryId },
    });

    return Response.json({ ok: true, item: row }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) return jsonError("Slug already exists.", 409);
    console.error(error);
    return jsonError("Could not create menu item.", 500);
  }
}
