import { count, eq, sql } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { bookings, roomTypes } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { isBeds24Enabled } from "@/lib/channel-manager";
import { syncRoomListPriceToChannel } from "@/lib/channel-manager/rate-sync";
import { jsonError } from "@/lib/format";
import { slugify } from "@/lib/slug";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);

    const { id } = await context.params;
    const roomId = Number(id);
    if (!Number.isFinite(roomId)) return jsonError("Invalid id.", 400);

    const body = await request.json();
    const db = getDb();
    const [existing] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, roomId))
      .limit(1);
    if (!existing) return jsonError("Room not found.", 404);

    const patch: Record<string, unknown> = {
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    if (body.name != null) patch.name = String(body.name).trim();
    if (body.slug != null) {
      patch.slug =
        String(body.slug).trim() ||
        slugify(String(body.name ?? existing.name));
    }
    if (body.description !== undefined) {
      patch.description = body.description ? String(body.description) : null;
    }
    if (body.shortDescription !== undefined) {
      patch.shortDescription = body.shortDescription
        ? String(body.shortDescription)
        : null;
    }
    if (body.pricePerNight != null) patch.pricePerNight = Number(body.pricePerNight);
    if (body.promotionalPrice !== undefined) {
      patch.promotionalPrice =
        body.promotionalPrice === null || body.promotionalPrice === ""
          ? null
          : Number(body.promotionalPrice);
    }
    if (body.inventoryCount != null) {
      patch.inventoryCount = Number(body.inventoryCount);
    }
    if (body.maxAdults != null) patch.maxAdults = Number(body.maxAdults);
    if (body.maxChildren != null) patch.maxChildren = Number(body.maxChildren);
    if (body.maxGuests != null) patch.maxGuests = Number(body.maxGuests);
    if (body.bedType !== undefined) {
      patch.bedType = body.bedType ? String(body.bedType) : null;
    }
    if (body.roomSize !== undefined) {
      patch.roomSize = body.roomSize ? String(body.roomSize) : null;
    }
    if (body.featuredImage !== undefined) {
      patch.featuredImage = body.featuredImage
        ? String(body.featuredImage)
        : null;
    }
    if (body.isActive !== undefined) {
      patch.isActive = body.isActive === true || body.isActive === "true";
    }
    if (body.isFeatured !== undefined) {
      patch.isFeatured = body.isFeatured === true || body.isFeatured === "true";
    }
    if (body.displayOrder != null) patch.displayOrder = Number(body.displayOrder);
    if (body.translationsJson !== undefined) {
      patch.translationsJson =
        typeof body.translationsJson === "string"
          ? body.translationsJson
          : JSON.stringify(body.translationsJson ?? {});
    }

    await db.update(roomTypes).set(patch).where(eq(roomTypes.id, roomId));

    await writeAuditLog({
      adminUserId: user.id,
      action: "room.update",
      entityType: "room_type",
      entityId: roomId,
      details: body,
    });

    const [room] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, roomId))
      .limit(1);

    let channelSync: {
      syncStatus: "Synced" | "local_only" | "FAILED";
      message: string;
    } | null = null;

    const priceChanged =
      body.pricePerNight != null ||
      body.promotionalPrice !== undefined ||
      body.inventoryCount != null;
    if (priceChanged && room) {
      const effective =
        room.promotionalPrice != null && room.promotionalPrice > 0
          ? room.promotionalPrice
          : room.pricePerNight;
      channelSync = await syncRoomListPriceToChannel({
        roomTypeId: roomId,
        pricePerNight: effective,
        inventoryCount: room.inventoryCount,
      });
      if (isBeds24Enabled() && channelSync.syncStatus === "FAILED") {
        return Response.json({
          ok: true,
          room,
          channelSync,
          warning:
            "Room saved locally, but Beds24 sync failed. Booking.com may still show the previous price.",
        });
      }
    }

    return Response.json({
      ok: true,
      room,
      channelSync: channelSync ?? {
        syncStatus: isBeds24Enabled() ? "Synced" : "local_only",
        message: isBeds24Enabled()
          ? "No price/inventory change to sync."
          : "Beds24 synchronisation is disabled.",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not update room.", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);

    const { id } = await context.params;
    const roomId = Number(id);
    if (!Number.isFinite(roomId)) return jsonError("Invalid id.", 400);

    const db = getDb();
    const [existing] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, roomId))
      .limit(1);
    if (!existing) return jsonError("Room not found.", 404);

    const [bookingCount] = await db
      .select({ c: count() })
      .from(bookings)
      .where(eq(bookings.roomTypeId, roomId));

    if ((bookingCount?.c ?? 0) > 0) {
      await db
        .update(roomTypes)
        .set({ isActive: false, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(roomTypes.id, roomId));

      await writeAuditLog({
        adminUserId: user.id,
        action: "room.soft_deactivate",
        entityType: "room_type",
        entityId: roomId,
      });

      return Response.json({
        ok: true,
        softDeactivated: true,
        message:
          "Room has bookings, so it was deactivated instead of deleted.",
      });
    }

    await db.delete(roomTypes).where(eq(roomTypes.id, roomId));
    await writeAuditLog({
      adminUserId: user.id,
      action: "room.delete",
      entityType: "room_type",
      entityId: roomId,
    });

    return Response.json({ ok: true, deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not delete room.", 500);
  }
}
