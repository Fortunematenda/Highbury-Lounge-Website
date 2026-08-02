import { and, desc, eq, like, or } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { eventReservations, events } from "@/db/schema";
import { isReservationStatus } from "@/lib/event-constants";
import { jsonError } from "@/lib/format";

export async function GET(request: Request) {
  try {
    await requireAdmin(["administrator", "content_manager", "booking_manager"]);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = url.searchParams.get("status") || "";
    const eventId = Number(url.searchParams.get("eventId") || "");
    const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
    const pageSize = 30;

    const db = getDb();
    const filters = [];
    if (status && isReservationStatus(status)) {
      filters.push(eq(eventReservations.status, status));
    }
    if (Number.isFinite(eventId) && eventId > 0) {
      filters.push(eq(eventReservations.eventId, eventId));
    }
    if (q) {
      const pattern = `%${q}%`;
      filters.push(
        or(
          like(eventReservations.reference, pattern),
          like(eventReservations.fullName, pattern),
          like(eventReservations.email, pattern),
          like(eventReservations.phone, pattern),
          like(events.title, pattern),
        )!,
      );
    }

    const rows = await db
      .select({
        id: eventReservations.id,
        reference: eventReservations.reference,
        fullName: eventReservations.fullName,
        email: eventReservations.email,
        phone: eventReservations.phone,
        guestCount: eventReservations.guestCount,
        status: eventReservations.status,
        reservationType: eventReservations.reservationType,
        createdAt: eventReservations.createdAt,
        eventId: events.id,
        eventTitle: events.title,
        eventSlug: events.slug,
        eventStartAt: events.startAt,
      })
      .from(eventReservations)
      .leftJoin(events, eq(eventReservations.eventId, events.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(eventReservations.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return Response.json({ reservations: rows, page, pageSize });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load reservations.", 500);
  }
}
