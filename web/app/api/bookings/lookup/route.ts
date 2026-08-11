import { getBookingByReference, BookingError } from "@/lib/bookings";
import { jsonError } from "@/lib/format";

const recentLookups = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { reference?: string };
    const reference = (body.reference || "").trim().toUpperCase();
    if (!reference) {
      return jsonError("Enter your booking reference.", 400);
    }

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    const key = `${ip}:${reference}`;
    const now = Date.now();
    const last = recentLookups.get(key) ?? 0;
    if (now - last < 5_000) {
      return jsonError("Please wait a moment before trying again.", 429);
    }
    recentLookups.set(key, now);

    const row = await getBookingByReference(reference);
    if (!row?.booking) {
      return Response.json({
        ok: true,
        found: false,
        message:
          "No booking found for that reference. Check the code from your confirmation and try again.",
      });
    }

    const { booking } = row;
    return Response.json({
      ok: true,
      found: true,
      booking: {
        reference: booking.reference,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        adults: booking.adults,
        children: booking.children,
        roomsBooked: booking.roomsBooked,
        currency: booking.currency,
        totalAmount: booking.totalAmount,
        roomName: row.roomName,
        guestName: [row.guestFirstName, row.guestLastName]
          .filter(Boolean)
          .join(" "),
      },
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Unable to look up booking.", 500);
  }
}
