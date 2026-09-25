import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  isBeds24Enabled,
  syncBookingOutboundIfEnabled,
} from "@/lib/channel-manager";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";

/**
 * Staff retry for outbound Beds24 sync on a booking.
 * No-op-friendly when BEDS24_ENABLED=false.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "booking_manager"]);
    const { id } = await context.params;
    const bookingId = Number(id);
    if (!Number.isFinite(bookingId)) return jsonError("Invalid id.", 400);

    const body = await request.json().catch(() => ({}));
    if (body?.action && body.action !== "retry_outbound") {
      return jsonError("Unsupported action.", 400);
    }

    const db = getDb();
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) return jsonError("Booking not found.", 404);

    if (!isBeds24Enabled()) {
      return Response.json({
        synced: false,
        reason: "disabled",
        message: "Beds24 synchronisation is disabled.",
      });
    }

    const result = await syncBookingOutboundIfEnabled(bookingId);

    await writeAuditLog({
      adminUserId: user.id,
      action: "booking.channel_sync_retry",
      entityType: "booking",
      entityId: bookingId,
      details: result,
    });

    if (result.synced) {
      return Response.json({
        synced: true,
        reason: result.reason,
        externalId: "externalId" in result ? result.externalId : undefined,
        message:
          result.reason === "already_synced"
            ? "Already linked to Beds24."
            : "Pushed booking to Beds24.",
      });
    }

    return Response.json(
      {
        synced: false,
        reason: result.reason,
        message:
          result.reason === "unmapped"
            ? "Room is not mapped to Beds24."
            : ("error" in result && result.error) ||
              "Channel sync did not complete.",
      },
      { status: result.reason === "error" || result.reason === "unmapped" ? 502 : 200 },
    );
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not sync booking.", 500);
  }
}
