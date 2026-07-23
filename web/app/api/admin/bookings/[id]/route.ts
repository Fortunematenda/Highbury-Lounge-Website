import { eq, sql } from "drizzle-orm";
import { AuthError, canManageBookings, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { bookingGuests, bookings, roomTypes } from "@/db/schema";
import { getAvailableCount, nightsBetween } from "@/lib/availability";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { queueNotification } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "booking_manager"]);
    if (!canManageBookings(user.roleKey)) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await context.params;
    const bookingId = Number(id);
    if (!Number.isFinite(bookingId)) return jsonError("Invalid booking id.", 400);

    const body = await request.json();
    const db = getDb();

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) return jsonError("Booking not found.", 404);

    const updates: Partial<typeof bookings.$inferInsert> = {
      updatedAt: sql`CURRENT_TIMESTAMP` as unknown as string,
    };

    if (body.adminNotes !== undefined) {
      updates.adminNotes = body.adminNotes == null ? null : String(body.adminNotes);
    }

    const checkIn = body.checkIn != null ? String(body.checkIn) : booking.checkIn;
    const checkOut =
      body.checkOut != null ? String(body.checkOut) : booking.checkOut;
    const roomTypeId =
      body.roomTypeId != null ? Number(body.roomTypeId) : booking.roomTypeId;
    const roomsBooked =
      body.roomsBooked != null ? Number(body.roomsBooked) : booking.roomsBooked;

    const datesOrRoomChanging =
      checkIn !== booking.checkIn ||
      checkOut !== booking.checkOut ||
      roomTypeId !== booking.roomTypeId ||
      roomsBooked !== booking.roomsBooked;

    if (datesOrRoomChanging) {
      if (!checkIn || !checkOut || checkOut <= checkIn) {
        return jsonError("Check-out must be after check-in.", 400);
      }

      const [room] = await db
        .select()
        .from(roomTypes)
        .where(eq(roomTypes.id, roomTypeId))
        .limit(1);
      if (!room) return jsonError("Room type not found.", 404);

      const remaining = await getAvailableCount(
        room.id,
        room.inventoryCount,
        checkIn,
        checkOut,
        bookingId,
      );
      if (remaining < roomsBooked) {
        return jsonError(
          "Selected room is not available for these dates.",
          409,
        );
      }

      updates.checkIn = checkIn;
      updates.checkOut = checkOut;
      updates.roomTypeId = roomTypeId;
      updates.roomsBooked = roomsBooked;
      updates.nights = nightsBetween(checkIn, checkOut);
    }

    if (body.adults != null) updates.adults = Number(body.adults);
    if (body.children != null) updates.children = Number(body.children);
    if (body.specialRequests !== undefined) {
      updates.specialRequests =
        body.specialRequests == null ? null : String(body.specialRequests);
    }

    await db.update(bookings).set(updates).where(eq(bookings.id, bookingId));

    if (body.guest && typeof body.guest === "object") {
      const g = body.guest as Record<string, unknown>;
      const guestUpdate: Partial<typeof bookingGuests.$inferInsert> = {
        updatedAt: sql`CURRENT_TIMESTAMP` as unknown as string,
      };
      if (g.firstName != null) guestUpdate.firstName = String(g.firstName).trim();
      if (g.lastName != null) guestUpdate.lastName = String(g.lastName).trim();
      if (g.email != null) guestUpdate.email = String(g.email).trim().toLowerCase();
      if (g.phone != null) guestUpdate.phone = String(g.phone).trim();
      if (g.whatsapp !== undefined) {
        guestUpdate.whatsapp = g.whatsapp ? String(g.whatsapp).trim() : null;
      }
      if (g.country !== undefined) {
        guestUpdate.country = g.country ? String(g.country).trim() : null;
      }

      await db
        .update(bookingGuests)
        .set(guestUpdate)
        .where(eq(bookingGuests.bookingId, bookingId));
    }

    if (datesOrRoomChanging) {
      const [guest] = await db
        .select()
        .from(bookingGuests)
        .where(eq(bookingGuests.bookingId, bookingId))
        .limit(1);
      const [room] = await db
        .select()
        .from(roomTypes)
        .where(eq(roomTypes.id, roomTypeId))
        .limit(1);
      if (guest) {
        await queueNotification({
          templateKey: "booking_changed",
          recipientEmail: guest.email,
          recipientName: `${guest.firstName} ${guest.lastName}`,
          context: {
            guestName: `${guest.firstName} ${guest.lastName}`,
            reference: booking.reference,
            roomName: room?.name ?? "Room",
            checkIn,
            checkOut,
            guests: `${updates.adults ?? booking.adults} adult(s), ${updates.children ?? booking.children} child(ren)`,
            total: `${booking.currency} ${booking.totalAmount.toFixed(2)}`,
            status: booking.status,
          },
          relatedType: "booking",
          relatedId: bookingId,
        });
      }
    }

    await writeAuditLog({
      adminUserId: user.id,
      action: "booking.update",
      entityType: "booking",
      entityId: bookingId,
      details: body,
    });

    const [fresh] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    return Response.json({ ok: true, booking: fresh });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not update booking.", 500);
  }
}
