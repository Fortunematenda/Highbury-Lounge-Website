import { AuthError, requireAdmin } from "@/lib/auth";
import {
  getBeds24Config,
  isBeds24Enabled,
  writeChannelSyncLog,
  BEDS24_PROVIDER,
  getChannelManager,
} from "@/lib/channel-manager";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { channelRoomMappings, roomTypes } from "@/db/schema";
import { jsonError } from "@/lib/format";
import { ChannelManagerError } from "@/lib/channel-manager/types";

/**
 * Rates & availability updates for accommodation.
 * When Beds24 is disabled, updates Highbury room list price only.
 * When enabled, pushes to Beds24 for mapped rooms.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(["administrator", "booking_manager", "content_manager"]);
    const body = await request.json();
    const roomTypeId = Number(body.roomTypeId);
    const from = String(body.from ?? "").trim();
    const to = String(body.to ?? "").trim();
    const price =
      body.price != null && body.price !== "" ? Number(body.price) : undefined;
    const minStay =
      body.minStay != null && body.minStay !== ""
        ? Number(body.minStay)
        : undefined;
    const available =
      body.available != null && body.available !== ""
        ? Number(body.available)
        : undefined;
    const closed = Boolean(body.closed);

    if (!Number.isFinite(roomTypeId)) {
      return jsonError("roomTypeId is required.", 400);
    }
    if (!from || !to) {
      return jsonError("from and to dates are required.", 400);
    }

    const db = getDb();
    const [room] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, roomTypeId))
      .limit(1);
    if (!room) return jsonError("Room not found.", 404);

    // Local list-price update (website content remains Highbury-owned)
    if (price != null && Number.isFinite(price) && price >= 0) {
      await db
        .update(roomTypes)
        .set({
          pricePerNight: price,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(roomTypes.id, roomTypeId));
    }

    if (!isBeds24Enabled()) {
      await writeChannelSyncLog({
        provider: BEDS24_PROVIDER,
        entityType: "rate",
        entityId: roomTypeId,
        direction: "OUTBOUND",
        eventType: "rate.update",
        status: "SUCCESS",
        message:
          "Saved locally. Beds24 synchronisation is disabled — channel rates were not updated.",
      });
      return Response.json({
        ok: true,
        syncStatus: "local_only",
        message: "Beds24 synchronisation is disabled.",
      });
    }

    const config = getBeds24Config();
    const [mapping] = await db
      .select()
      .from(channelRoomMappings)
      .where(
        and(
          eq(channelRoomMappings.provider, BEDS24_PROVIDER),
          eq(channelRoomMappings.localRoomTypeId, roomTypeId),
          eq(channelRoomMappings.enabled, true),
        ),
      )
      .limit(1);

    if (!mapping) {
      await writeChannelSyncLog({
        provider: BEDS24_PROVIDER,
        entityType: "rate",
        entityId: roomTypeId,
        direction: "OUTBOUND",
        eventType: "rate.update",
        status: "FAILED",
        error: "unmapped_room",
        message: "Cannot sync rates for an unmapped room.",
      });
      return jsonError(
        "This room is not mapped to Beds24. Map it before live synchronisation.",
        409,
      );
    }

    try {
      const provider = getChannelManager();
      await provider.updateRates([
        {
          propertyId: mapping.externalPropertyId || config.propertyId,
          roomId: mapping.externalRoomId,
          from,
          to,
          price,
          minStay,
          available,
          closed,
        },
      ]);
      await writeChannelSyncLog({
        provider: BEDS24_PROVIDER,
        entityType: "rate",
        entityId: roomTypeId,
        externalReference: mapping.externalRoomId,
        direction: "OUTBOUND",
        eventType: "rate.update",
        status: "SUCCESS",
        message: `Synced rates ${from} → ${to} for ${room.name}`,
      });
      return Response.json({ ok: true, syncStatus: "Synced" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Beds24 rejected the update.";
      await writeChannelSyncLog({
        provider: BEDS24_PROVIDER,
        entityType: "rate",
        entityId: roomTypeId,
        externalReference: mapping.externalRoomId,
        direction: "OUTBOUND",
        eventType: "rate.update",
        status: "FAILED",
        error: message,
      });
      if (err instanceof ChannelManagerError) {
        return jsonError(message, err.status);
      }
      return jsonError(message, 502);
    }
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Unable to update rates.", 500);
  }
}
