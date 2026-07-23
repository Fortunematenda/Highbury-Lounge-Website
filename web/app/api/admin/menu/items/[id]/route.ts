import { and, asc, eq, sql } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import {
  bookingExtras,
  menuCategories,
  menuItemImages,
  menuItems,
} from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { isMenuItemType, isPriceUnit } from "@/lib/menu-constants";
import { slugify } from "@/lib/slug";
import { normalizeTranslationsJson } from "@/lib/i18n/content";
import { deleteStoredObject } from "@/lib/uploads";

function parseBool(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === "on") return true;
  if (value === "false" || value === "0") return false;
  return Boolean(value);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const id = Number((await context.params).id);
    const db = getDb();
    const [row] = await db
      .select({
        item: menuItems,
        categoryName: menuCategories.name,
      })
      .from(menuItems)
      .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(eq(menuItems.id, id))
      .limit(1);
    if (!row) return jsonError("Menu item not found.", 404);
    const images = await db
      .select()
      .from(menuItemImages)
      .where(eq(menuItemImages.menuItemId, id))
      .orderBy(asc(menuItemImages.displayOrder));
    return Response.json({
      item: { ...row.item, categoryName: row.categoryName, images },
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Failed to load menu item.", 500);
  }
}

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
    const [existing] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id))
      .limit(1);
    if (!existing) return jsonError("Menu item not found.", 404);

    if (body.action === "archive") {
      await db
        .update(menuItems)
        .set({
          archivedAt: new Date().toISOString(),
          isActive: false,
          isAvailable: false,
          publicVisible: false,
          updatedById: user.id,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(menuItems.id, id));
      await writeAuditLog({
        adminUserId: user.id,
        action: "menu.item_archived",
        entityType: "menu_item",
        entityId: id,
      });
      return Response.json({ ok: true });
    }

    if (body.action === "restore") {
      await db
        .update(menuItems)
        .set({
          archivedAt: null,
          isActive: true,
          publicVisible: true,
          updatedById: user.id,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(menuItems.id, id));
      await writeAuditLog({
        adminUserId: user.id,
        action: "menu.item_restored",
        entityType: "menu_item",
        entityId: id,
      });
      return Response.json({ ok: true });
    }

    if (body.action === "duplicate") {
      const [copy] = await db
        .insert(menuItems)
        .values({
          name: `${existing.name} (Copy)`,
          slug: `${existing.slug || slugify(existing.name)}-copy-${Date.now().toString(36)}`,
          sku: existing.sku,
          categoryId: existing.categoryId,
          itemType: existing.itemType,
          shortDescription: existing.shortDescription,
          description: existing.description,
          price: existing.price,
          promotionalPrice: existing.promotionalPrice,
          currency: existing.currency,
          priceUnit: existing.priceUnit,
          imageUrl: existing.imageUrl,
          tags: existing.tags,
          quantityAvailable: existing.quantityAvailable,
          preparationTimeMinutes: existing.preparationTimeMinutes,
          availableFrom: existing.availableFrom,
          availableUntil: existing.availableUntil,
          isActive: existing.isActive,
          isAvailable: existing.isAvailable,
          isFeatured: false,
          allowPreOrder: existing.allowPreOrder,
          allowRoomBooking: existing.allowRoomBooking,
          allowConferenceBooking: existing.allowConferenceBooking,
          isVegetarian: existing.isVegetarian,
          isVegan: existing.isVegan,
          isHalal: existing.isHalal,
          isGlutenFree: existing.isGlutenFree,
          containsNuts: existing.containsNuts,
          isSpicy: existing.isSpicy,
          allergens: existing.allergens,
          ingredients: existing.ingredients,
          servingSize: existing.servingSize,
          displayOrder: existing.displayOrder,
          publicVisible: existing.publicVisible,
          adminNotes: existing.adminNotes,
          translationsJson: existing.translationsJson,
          createdById: user.id,
          updatedById: user.id,
        })
        .returning();
      await writeAuditLog({
        adminUserId: user.id,
        action: "menu.item_duplicated",
        entityType: "menu_item",
        entityId: copy.id,
        details: { fromId: id },
      });
      return Response.json({ ok: true, item: copy }, { status: 201 });
    }

    if (body.action === "toggle_available") {
      const next = !existing.isAvailable;
      await db
        .update(menuItems)
        .set({
          isAvailable: next,
          updatedById: user.id,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(menuItems.id, id));
      await writeAuditLog({
        adminUserId: user.id,
        action: "menu.availability_changed",
        entityType: "menu_item",
        entityId: id,
        details: { isAvailable: next },
      });
      return Response.json({ ok: true });
    }

    if (body.action === "toggle_active") {
      const next = !existing.isActive;
      await db
        .update(menuItems)
        .set({
          isActive: next,
          updatedById: user.id,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(menuItems.id, id));
      await writeAuditLog({
        adminUserId: user.id,
        action: "menu.active_changed",
        entityType: "menu_item",
        entityId: id,
        details: { isActive: next },
      });
      return Response.json({ ok: true });
    }

    if (body.action === "toggle_featured") {
      const next = !existing.isFeatured;
      await db
        .update(menuItems)
        .set({
          isFeatured: next,
          updatedById: user.id,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(menuItems.id, id));
      await writeAuditLog({
        adminUserId: user.id,
        action: "menu.featured_changed",
        entityType: "menu_item",
        entityId: id,
        details: { isFeatured: next },
      });
      return Response.json({ ok: true });
    }

    const name = body.name != null ? String(body.name).trim() : existing.name;
    const categoryId =
      body.categoryId != null ? Number(body.categoryId) : existing.categoryId;
    const itemType = body.itemType
      ? String(body.itemType)
      : existing.itemType;
    const price =
      body.price != null || body.standardPrice != null
        ? Number(body.price ?? body.standardPrice)
        : existing.price;
    const promotionalPrice =
      body.promotionalPrice !== undefined
        ? body.promotionalPrice === "" || body.promotionalPrice == null
          ? null
          : Number(body.promotionalPrice)
        : existing.promotionalPrice;
    const priceUnit = body.priceUnit
      ? String(body.priceUnit)
      : existing.priceUnit;

    if (!name) return jsonError("Item name is required.", 400);
    if (!Number.isFinite(categoryId)) return jsonError("Category is required.", 400);
    if (!isMenuItemType(itemType)) return jsonError("Invalid item type.", 400);
    if (!Number.isFinite(price) || price < 0) {
      return jsonError("Standard price must be zero or greater.", 400);
    }
    if (
      promotionalPrice != null &&
      (promotionalPrice < 0 || promotionalPrice >= price)
    ) {
      return jsonError("Promotional price must be lower than the standard price.", 400);
    }
    if (!isPriceUnit(priceUnit)) return jsonError("Invalid price unit.", 400);

    const [row] = await db
      .update(menuItems)
      .set({
        name,
        slug:
          body.slug != null
            ? String(body.slug).trim() || slugify(name)
            : existing.slug,
        sku: body.sku !== undefined ? String(body.sku || "") || null : existing.sku,
        categoryId,
        itemType,
        shortDescription:
          body.shortDescription !== undefined
            ? String(body.shortDescription || "") || null
            : existing.shortDescription,
        description:
          body.description !== undefined
            ? String(body.description || "") || null
            : existing.description,
        price,
        promotionalPrice,
        currency:
          body.currency != null
            ? String(body.currency).trim() || "USD"
            : existing.currency,
        priceUnit,
        imageUrl:
          body.imageUrl !== undefined
            ? String(body.imageUrl || "") || null
            : existing.imageUrl,
        tags: body.tags !== undefined ? String(body.tags || "") || null : existing.tags,
        quantityAvailable:
          body.quantityAvailable !== undefined
            ? body.quantityAvailable === "" || body.quantityAvailable == null
              ? null
              : Number(body.quantityAvailable)
            : existing.quantityAvailable,
        preparationTimeMinutes:
          body.preparationTimeMinutes !== undefined
            ? body.preparationTimeMinutes === "" ||
              body.preparationTimeMinutes == null
              ? null
              : Number(body.preparationTimeMinutes)
            : existing.preparationTimeMinutes,
        availableFrom:
          body.availableFrom !== undefined
            ? body.availableFrom || null
            : existing.availableFrom,
        availableUntil:
          body.availableUntil !== undefined
            ? body.availableUntil || null
            : existing.availableUntil,
        isActive:
          body.isActive !== undefined
            ? parseBool(body.isActive, existing.isActive)
            : existing.isActive,
        isAvailable:
          body.isAvailable !== undefined
            ? parseBool(body.isAvailable, existing.isAvailable)
            : existing.isAvailable,
        isFeatured:
          body.isFeatured !== undefined
            ? parseBool(body.isFeatured, existing.isFeatured)
            : existing.isFeatured,
        allowPreOrder:
          body.allowPreOrder !== undefined
            ? parseBool(body.allowPreOrder, existing.allowPreOrder)
            : existing.allowPreOrder,
        allowRoomBooking:
          body.allowRoomBooking !== undefined
            ? parseBool(body.allowRoomBooking, existing.allowRoomBooking)
            : existing.allowRoomBooking,
        allowConferenceBooking:
          body.allowConferenceBooking !== undefined
            ? parseBool(
                body.allowConferenceBooking,
                existing.allowConferenceBooking,
              )
            : existing.allowConferenceBooking,
        isVegetarian:
          body.isVegetarian !== undefined
            ? parseBool(body.isVegetarian, Boolean(existing.isVegetarian))
            : existing.isVegetarian,
        isVegan:
          body.isVegan !== undefined
            ? parseBool(body.isVegan, Boolean(existing.isVegan))
            : existing.isVegan,
        isHalal:
          body.isHalal !== undefined
            ? parseBool(body.isHalal, Boolean(existing.isHalal))
            : existing.isHalal,
        isGlutenFree:
          body.isGlutenFree !== undefined
            ? parseBool(body.isGlutenFree, Boolean(existing.isGlutenFree))
            : existing.isGlutenFree,
        containsNuts:
          body.containsNuts !== undefined
            ? parseBool(body.containsNuts, Boolean(existing.containsNuts))
            : existing.containsNuts,
        isSpicy:
          body.isSpicy !== undefined
            ? parseBool(body.isSpicy, Boolean(existing.isSpicy))
            : existing.isSpicy,
        allergens:
          body.allergens !== undefined
            ? String(body.allergens || "") || null
            : existing.allergens,
        ingredients:
          body.ingredients !== undefined
            ? String(body.ingredients || "") || null
            : existing.ingredients,
        servingSize:
          body.servingSize !== undefined
            ? String(body.servingSize || "") || null
            : existing.servingSize,
        displayOrder:
          body.displayOrder != null
            ? Number(body.displayOrder)
            : existing.displayOrder,
        publicVisible:
          body.publicVisible !== undefined
            ? parseBool(body.publicVisible, existing.publicVisible)
            : existing.publicVisible,
        adminNotes:
          body.adminNotes !== undefined
            ? String(body.adminNotes || "") || null
            : existing.adminNotes,
        translationsJson:
          body.translationsJson !== undefined
            ? (normalizeTranslationsJson(body.translationsJson) ?? null)
            : existing.translationsJson,
        updatedById: user.id,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(menuItems.id, id))
      .returning();

    await writeAuditLog({
      adminUserId: user.id,
      action: "menu.item_updated",
      entityType: "menu_item",
      entityId: id,
      details: {
        previousPrice: existing.price,
        newPrice: row.price,
      },
    });

    return Response.json({ ok: true, item: row });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not update menu item.", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator"]);
    const id = Number((await context.params).id);
    const db = getDb();

    const extras = await db
      .select({ id: bookingExtras.id })
      .from(bookingExtras)
      .where(eq(bookingExtras.menuItemId, id))
      .limit(1);
    if (extras.length) {
      return jsonError(
        "Cannot permanently delete an item linked to bookings. Archive it instead.",
        409,
      );
    }

    const images = await db
      .select()
      .from(menuItemImages)
      .where(eq(menuItemImages.menuItemId, id));
    await db.delete(menuItems).where(eq(menuItems.id, id));
    for (const image of images) {
      await deleteStoredObject(image.storageKey);
    }

    await writeAuditLog({
      adminUserId: user.id,
      action: "menu.item_deleted",
      entityType: "menu_item",
      entityId: id,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Could not delete menu item.", 500);
  }
}
