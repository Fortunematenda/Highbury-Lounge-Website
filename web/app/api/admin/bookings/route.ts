import { AuthError, requireAdmin } from "@/lib/auth";
import { BookingError, createBooking } from "@/lib/bookings";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";

/**
 * Staff manual booking (phone / WhatsApp / walk-in).
 * Uses the same createBooking path so Beds24 sync runs when enabled.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAdmin([
      "administrator",
      "booking_manager",
    ]);
    const body = await request.json();

    const roomTypeId = Number(body.roomTypeId);
    const checkIn = String(body.checkIn ?? "").trim();
    const checkOut = String(body.checkOut ?? "").trim();
    const adults = Number(body.adults ?? 1);
    const children = Number(body.children ?? 0);
    const roomsBooked = Number(body.roomsBooked ?? 1);

    if (!Number.isFinite(roomTypeId)) {
      return jsonError("roomTypeId is required.", 400);
    }

    const booking = await createBooking({
      roomTypeId,
      checkIn,
      checkOut,
      adults,
      children,
      roomsBooked,
      source: "MANUAL",
      guest: {
        firstName: String(body.firstName ?? "").trim(),
        lastName: String(body.lastName ?? "").trim(),
        email: String(body.email ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        whatsapp: body.whatsapp ? String(body.whatsapp).trim() : undefined,
        country: body.country ? String(body.country).trim() : undefined,
        specialRequests: body.specialRequests
          ? String(body.specialRequests).trim()
          : undefined,
        termsAccepted: true,
      },
    });

    await writeAuditLog({
      adminUserId: user.id,
      action: "booking.manual_create",
      entityType: "booking",
      entityId: booking.id,
      details: { reference: booking.reference },
    });

    return Response.json({ ok: true, booking }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.message, error.status);
    }
    if (error instanceof BookingError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Could not create manual booking.", 500);
  }
}
