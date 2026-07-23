import { createBooking, BookingError } from "@/lib/bookings";
import { jsonError } from "@/lib/format";

const recentSubmissions = new Map<string, number>();

function rateLimitKey(ip: string, email: string) {
  return `${ip}:${email}`.toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      roomTypeId?: number;
      checkIn?: string;
      checkOut?: string;
      adults?: number;
      children?: number;
      roomsBooked?: number;
      guest?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        whatsapp?: string;
        country?: string;
        specialRequests?: string;
        estimatedArrival?: string;
        termsAccepted?: boolean;
      };
      preferredLanguage?: string;
      idempotencyKey?: string;
    };

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    const email = body.guest?.email?.trim() || "";
    const key = rateLimitKey(ip, email || body.idempotencyKey || "anon");
    const now = Date.now();
    const last = recentSubmissions.get(key) ?? 0;
    if (now - last < 15_000) {
      return jsonError("Please wait a moment before submitting again.", 429);
    }
    recentSubmissions.set(key, now);

    if (!body.roomTypeId || !body.checkIn || !body.checkOut || !body.guest) {
      return jsonError("Missing required booking fields.", 400);
    }

    const booking = await createBooking({
      roomTypeId: body.roomTypeId,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      adults: body.adults ?? 1,
      children: body.children ?? 0,
      roomsBooked: body.roomsBooked ?? 1,
      preferredLanguage: body.preferredLanguage || "en",
      guest: {
        firstName: body.guest.firstName ?? "",
        lastName: body.guest.lastName ?? "",
        email: body.guest.email ?? "",
        phone: body.guest.phone ?? "",
        whatsapp: body.guest.whatsapp,
        country: body.guest.country,
        specialRequests: body.guest.specialRequests,
        estimatedArrival: body.guest.estimatedArrival,
        termsAccepted: Boolean(body.guest.termsAccepted),
      },
    });

    return Response.json(
      {
        ok: true,
        booking: {
          id: booking.id,
          reference: booking.reference,
          status: booking.status,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: booking.nights,
          expiresAt: booking.expiresAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BookingError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Unable to create booking.", 500);
  }
}
