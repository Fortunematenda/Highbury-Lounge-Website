import { AuthError, canManageBookings, requireAdmin } from "@/lib/auth";
import { BookingError, updateBookingStatus } from "@/lib/bookings";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";

const ALLOWED = new Set([
  "Pending",
  "Awaiting Payment",
  "Confirmed",
  "Checked In",
  "Checked Out",
  "Cancelled",
  "Declined",
  "No Show",
  "Expired",
]);

export async function POST(
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
    const status = String(body.status ?? "");
    const note = body.note != null ? String(body.note) : undefined;
    if (!ALLOWED.has(status)) {
      return jsonError("Invalid status.", 400);
    }

    const updated = await updateBookingStatus({
      bookingId,
      newStatus: status,
      adminUserId: user.id,
      note,
    });

    await writeAuditLog({
      adminUserId: user.id,
      action: "booking.status_update",
      entityType: "booking",
      entityId: bookingId,
      details: { status, note },
    });

    return Response.json({ ok: true, booking: updated });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof BookingError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not update status.", 500);
  }
}
