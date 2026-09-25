import { AuthError, requireAdmin } from "@/lib/auth";
import {
  listRoomChannelStatuses,
  retryRoomRateSync,
} from "@/lib/channel-manager/room-sync-status";
import { isBeds24Enabled } from "@/lib/channel-manager";
import { jsonError } from "@/lib/format";

/** Per-room channel sync snapshot for Rates / Rooms admin. */
export async function GET() {
  try {
    await requireAdmin([
      "administrator",
      "booking_manager",
      "content_manager",
    ]);
    const rooms = await listRoomChannelStatuses();
    return Response.json({
      enabled: isBeds24Enabled(),
      rooms,
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Unable to load room sync status.", 500);
  }
}

/** Retry pushing list price / inventory for one room to Beds24. */
export async function POST(request: Request) {
  try {
    await requireAdmin([
      "administrator",
      "booking_manager",
      "content_manager",
    ]);
    const body = await request.json().catch(() => ({}));
    const roomTypeId = Number(body.roomTypeId);
    if (!Number.isFinite(roomTypeId)) {
      return jsonError("roomTypeId is required.", 400);
    }
    if (!isBeds24Enabled()) {
      return Response.json({
        ok: true,
        syncStatus: "local_only",
        message: "Beds24 synchronisation is disabled.",
      });
    }
    const result = await retryRoomRateSync(roomTypeId);
    if (result.syncStatus === "FAILED") {
      return Response.json(
        {
          ok: false,
          syncStatus: result.syncStatus,
          message: result.message,
          warning:
            "Retry failed. Booking.com may still show the previous price.",
        },
        { status: 502 },
      );
    }
    return Response.json({
      ok: true,
      syncStatus: result.syncStatus,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Retry sync failed.", 500);
  }
}
