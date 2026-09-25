import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { channelRoomMappings, roomTypes } from "@/db/schema";
import { BEDS24_PROVIDER, isBeds24Enabled } from "./providers/beds24/config";
import { getLatestEntitySync, listChannelSyncLogs } from "./sync-log";
import { syncRoomListPriceToChannel } from "./rate-sync";

export type RoomChannelStatus = {
  roomTypeId: number;
  roomName: string;
  pricePerNight: number;
  promotionalPrice: number | null;
  effectivePrice: number;
  inventoryCount: number;
  mapped: boolean;
  externalRoomId: string | null;
  channelStatus: "Synced" | "Failed" | "Pending" | "Not mapped" | "Local only";
  lastSyncedAt: string | null;
  lastError: string | null;
  lastMessage: string | null;
};

/**
 * Per-room channel synchronisation snapshot for Admin Rates / Rooms.
 */
export async function listRoomChannelStatuses(): Promise<RoomChannelStatus[]> {
  const db = getDb();
  const rooms = await db
    .select({
      id: roomTypes.id,
      name: roomTypes.name,
      pricePerNight: roomTypes.pricePerNight,
      promotionalPrice: roomTypes.promotionalPrice,
      inventoryCount: roomTypes.inventoryCount,
    })
    .from(roomTypes)
    .orderBy(asc(roomTypes.displayOrder), asc(roomTypes.name));

  const mappings = await db
    .select()
    .from(channelRoomMappings)
    .where(
      and(
        eq(channelRoomMappings.provider, BEDS24_PROVIDER),
        eq(channelRoomMappings.enabled, true),
      ),
    );
  const byLocal = new Map(mappings.map((m) => [m.localRoomTypeId, m]));

  const recentLogs = await listChannelSyncLogs({
    provider: BEDS24_PROVIDER,
    limit: 200,
  });

  return rooms.map((room) => {
    const mapping = byLocal.get(room.id);
    const effective =
      room.promotionalPrice != null && room.promotionalPrice > 0
        ? room.promotionalPrice
        : room.pricePerNight;

    if (!mapping) {
      return {
        roomTypeId: room.id,
        roomName: room.name,
        pricePerNight: room.pricePerNight,
        promotionalPrice: room.promotionalPrice,
        effectivePrice: effective,
        inventoryCount: room.inventoryCount,
        mapped: false,
        externalRoomId: null,
        channelStatus: "Not mapped" as const,
        lastSyncedAt: null,
        lastError: null,
        lastMessage: null,
      };
    }

    if (!isBeds24Enabled()) {
      return {
        roomTypeId: room.id,
        roomName: room.name,
        pricePerNight: room.pricePerNight,
        promotionalPrice: room.promotionalPrice,
        effectivePrice: effective,
        inventoryCount: room.inventoryCount,
        mapped: true,
        externalRoomId: mapping.externalRoomId,
        channelStatus: "Local only" as const,
        lastSyncedAt: null,
        lastError: null,
        lastMessage: "Beds24 synchronisation is disabled.",
      };
    }

    const latest =
      recentLogs.find(
        (l) =>
          String(l.entityId) === String(room.id) &&
          (l.entityType === "rate" || l.entityType === "room_type") &&
          (l.eventType.includes("rate") || l.eventType.includes("inventory")),
      ) ?? null;

    let channelStatus: RoomChannelStatus["channelStatus"] = "Pending";
    if (!latest) channelStatus = "Pending";
    else if (latest.status === "SUCCESS") channelStatus = "Synced";
    else if (latest.status === "FAILED") channelStatus = "Failed";
    else channelStatus = "Pending";

    return {
      roomTypeId: room.id,
      roomName: room.name,
      pricePerNight: room.pricePerNight,
      promotionalPrice: room.promotionalPrice,
      effectivePrice: effective,
      inventoryCount: room.inventoryCount,
      mapped: true,
      externalRoomId: mapping.externalRoomId,
      channelStatus,
      lastSyncedAt: latest?.createdAt ?? null,
      lastError: latest?.error ?? null,
      lastMessage: latest?.message ?? null,
    };
  });
}

export async function retryRoomRateSync(roomTypeId: number) {
  const db = getDb();
  const [room] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, roomTypeId))
    .limit(1);
  if (!room) {
    return {
      syncStatus: "FAILED" as const,
      message: "Room not found.",
    };
  }
  const effective =
    room.promotionalPrice != null && room.promotionalPrice > 0
      ? room.promotionalPrice
      : room.pricePerNight;
  return syncRoomListPriceToChannel({
    roomTypeId,
    pricePerNight: effective,
    inventoryCount: room.inventoryCount,
  });
}

export async function getRoomRateSyncSnapshot(roomTypeId: number) {
  const latest = await getLatestEntitySync({
    provider: BEDS24_PROVIDER,
    entityType: "rate",
    entityId: roomTypeId,
  });
  return latest;
}
