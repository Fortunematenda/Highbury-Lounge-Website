import { createEventReservation, EventError } from "@/lib/events";
import { jsonError } from "@/lib/format";

const recentSubmissions = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      eventId?: number;
      fullName?: string;
      email?: string;
      phone?: string;
      guestCount?: number;
      reservationType?: string;
      seatingRequest?: string;
      notes?: string;
      consentAccepted?: boolean;
    };

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    const key = `${ip}:${(body.email || body.phone || "anon").toLowerCase()}`;
    const now = Date.now();
    const last = recentSubmissions.get(key) ?? 0;
    if (now - last < 15_000) {
      return jsonError("Please wait a moment before submitting again.", 429);
    }
    recentSubmissions.set(key, now);

    const eventId = Number(body.eventId);
    if (!Number.isFinite(eventId)) {
      return jsonError("Invalid event.", 400);
    }

    const result = await createEventReservation({
      eventId,
      fullName: body.fullName || "",
      email: body.email || "",
      phone: body.phone || "",
      guestCount: Number(body.guestCount || 1),
      reservationType: body.reservationType,
      seatingRequest: body.seatingRequest,
      notes: body.notes,
      consentAccepted: Boolean(body.consentAccepted),
    });

    return Response.json(
      {
        ok: true,
        reservation: {
          id: result.reservation.id,
          reference: result.reservation.reference,
          status: result.reservation.status,
        },
        event: {
          title: result.event.title,
          slug: result.event.slug,
          startAt: result.event.startAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof EventError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Unable to submit reservation.", 500);
  }
}
