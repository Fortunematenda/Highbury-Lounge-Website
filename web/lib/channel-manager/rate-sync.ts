import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { channelRoomMappings, roomTypes } from "@/db/schema";
import { getChannelManager } from "./factory";
import {
  BEDS24_PROVIDER,
  getBeds24Config,
  isBeds24Enabled,
} from "./providers/beds24/config";
import { writeChannelSyncLog } from "./sync-log";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Push the Highbury list price to Beds24 for a forward window (default 365 days).
 * Used when staff edit price on the room editor (not only the rates calendar form).
 */
export async function syncRoomListPriceToChannel(options: {
  roomTypeId: number;
  pricePerNight: number;
  inventoryCount?: number;
  daysForward?: number;
}): Promise<{
  syncStatus: "Synced" | "local_only" | "FAILED";
  message: string;
}> {
  if (!isBeds24Enabled()) {
    return {
      syncStatus: "local_only",
      message: "Saved locally. Beds24 synchronisation is disabled.",
    };
  }

  const db = getDb();
  const [room] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, options.roomTypeId))
    .limit(1);
  if (!room) {
    return { syncStatus: "FAILED", message: "Room not found." };
  }

  const [mapping] = await db
    .select()
    .from(channelRoomMappings)
    .where(
      and(
        eq(channelRoomMappings.provider, BEDS24_PROVIDER),
        eq(channelRoomMappings.localRoomTypeId, options.roomTypeId),
        eq(channelRoomMappings.enabled, true),
      ),
    )
    .limit(1);

  if (!mapping) {
    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "rate",
      entityId: options.roomTypeId,
      direction: "OUTBOUND",
      eventType: "rate.update",
      status: "FAILED",
      error: "unmapped_room",
      message: "Cannot sync list price for an unmapped room.",
    });
    return {
      syncStatus: "FAILED",
      message: "Room is not mapped to Beds24.",
    };
  }

  const from = isoDate(new Date());
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + (options.daysForward ?? 365));
  const to = isoDate(end);
  const config = getBeds24Config();

  try {
    const provider = getChannelManager();
    await provider.updateRates([
      {
        propertyId: mapping.externalPropertyId || config.propertyId,
        roomId: mapping.externalRoomId,
        from,
        to,
        price: options.pricePerNight,
        available: options.inventoryCount ?? room.inventoryCount,
      },
    ]);
    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "rate",
      entityId: options.roomTypeId,
      externalReference: mapping.externalRoomId,
      direction: "OUTBOUND",
      eventType: "rate.update",
      status: "SUCCESS",
      message: `Synced list price ${options.pricePerNight} for ${room.name} (${from} → ${to})`,
    });
    return {
      syncStatus: "Synced",
      message: `Synced to Beds24 (${from} → ${to}).`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Beds24 rate sync failed";
    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "rate",
      entityId: options.roomTypeId,
      externalReference: mapping.externalRoomId,
      direction: "OUTBOUND",
      eventType: "rate.update",
      status: "FAILED",
      error: message,
    });
    return { syncStatus: "FAILED", message };
  }
}
