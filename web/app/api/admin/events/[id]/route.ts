import { and, eq, isNull } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { eventReservations, events } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import {
  countReservedGuests,
  duplicateEvent,
  EventError,
  softDeleteEvent,
  toPublicEvent,
  updateEvent,
} from "@/lib/events";
import { jsonError } from "@/lib/format";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(["administrator", "content_manager", "booking_manager"]);
    const id = Number((await params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid event id.", 400);
    const db = getDb();
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), isNull(events.deletedAt)))
      .limit(1);
    if (!event) return jsonError("Event not found.", 404);
    const reservedGuests = await countReservedGuests(id);
    const reservations = await db
      .select()
      .from(eventReservations)
      .where(eq(eventReservations.eventId, id));
    return Response.json({
      event,
      public: toPublicEvent(event, reservedGuests),
      reservedGuests,
      reservationCount: reservations.length,
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load event.", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    const id = Number((await params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid event id.", 400);
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "duplicate") {
      const event = await duplicateEvent(id);
      await writeAuditLog({
        adminUserId: user.id,
        action: "event.duplicate",
        entityType: "event",
        entityId: event.id,
        details: { fromId: id },
      });
      return Response.json({ ok: true, event });
    }

    const event = await updateEvent(id, body);
    await writeAuditLog({
      adminUserId: user.id,
      action: "event.update",
      entityType: "event",
      entityId: id,
      details: { status: event.status, isFeatured: event.isFeatured },
    });
    return Response.json({ ok: true, event });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof EventError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to update event.", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    const id = Number((await params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid event id.", 400);
    const event = await softDeleteEvent(id);
    await writeAuditLog({
      adminUserId: user.id,
      action: "event.delete",
      entityType: "event",
      entityId: id,
      details: { title: event.title },
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof EventError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to delete event.", 500);
  }
}
