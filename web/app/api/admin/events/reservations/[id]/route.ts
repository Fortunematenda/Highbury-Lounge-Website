import { eq } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { eventReservations, events } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import {
  deleteEventReservation,
  EventError,
  updateReservationStatus,
} from "@/lib/events";
import { jsonError } from "@/lib/format";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(["administrator", "content_manager", "booking_manager"]);
    const id = Number((await params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid reservation id.", 400);
    const db = getDb();
    const [row] = await db
      .select({
        reservation: eventReservations,
        eventTitle: events.title,
        eventSlug: events.slug,
        eventStartAt: events.startAt,
        eventStatus: events.status,
      })
      .from(eventReservations)
      .leftJoin(events, eq(eventReservations.eventId, events.id))
      .where(eq(eventReservations.id, id))
      .limit(1);
    if (!row) return jsonError("Reservation not found.", 404);
    return Response.json(row);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load reservation.", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin([
      "administrator",
      "content_manager",
      "booking_manager",
    ]);
    const id = Number((await params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid reservation id.", 400);
    const body = (await request.json()) as {
      status?: string;
      adminNotes?: string;
    };
    if (!body.status) return jsonError("Status is required.", 400);
    const reservation = await updateReservationStatus({
      id,
      status: body.status,
      adminNotes: body.adminNotes,
    });
    await writeAuditLog({
      adminUserId: user.id,
      action: "event_reservation.update",
      entityType: "event_reservation",
      entityId: id,
      details: { status: reservation.status },
    });
    return Response.json({ ok: true, reservation });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof EventError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to update reservation.", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin([
      "administrator",
      "content_manager",
      "booking_manager",
    ]);
    const id = Number((await params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid reservation id.", 400);

    const reservation = await deleteEventReservation(id);
    await writeAuditLog({
      adminUserId: user.id,
      action: "event_reservation.delete",
      entityType: "event_reservation",
      entityId: id,
      details: {
        reference: reservation.reference,
        eventId: reservation.eventId,
      },
    });
    return Response.json({
      ok: true,
      deleted: true,
      reference: reservation.reference,
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof EventError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to delete reservation.", 500);
  }
}
