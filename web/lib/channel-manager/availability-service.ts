import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { channelRoomMappings, roomTypes } from "@/db/schema";
import {
  findAvailableRooms,
  getAvailableCount,
  type AvailableRoom,
} from "@/lib/availability";
import { getChannelManager } from "./factory";
import { isBeds24Enabled } from "./providers/beds24/config";
import { BEDS24_PROVIDER } from "./providers/beds24/config";
import { writeChannelSyncLog } from "./sync-log";
import { ChannelManagerError } from "./types";

export type AvailabilitySearchParams = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomsNeeded?: number;
};

/**
 * Internal availability facade.
 * BEDS24_ENABLED=false → existing Highbury logic.
 * BEDS24_ENABLED=true → Beds24 authoritative inventory for mapped rooms.
 */
export async function searchAccommodationAvailability(
  params: AvailabilitySearchParams,
): Promise<AvailableRoom[]> {
  if (!isBeds24Enabled()) {
    return findAvailableRooms(params);
  }

  const local = await findAvailableRooms(params);
  const db = getDb();
  const mappings = await db
    .select()
    .from(channelRoomMappings)
    .where(
      and(
        eq(channelRoomMappings.provider, BEDS24_PROVIDER),
        eq(channelRoomMappings.enabled, true),
      ),
    );

  if (!mappings.length) {
    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "availability",
      direction: "OUTBOUND",
      eventType: "availability.search",
      status: "FAILED",
      message: "Beds24 enabled but no room mappings configured.",
      error: "unmapped_rooms",
    });
    // Fail closed for unmapped inventory when channel is authoritative
    return [];
  }

  const provider = getChannelManager();
  const byLocal = new Map(
    mappings.map((m) => [m.localRoomTypeId, m] as const),
  );

  const results: AvailableRoom[] = [];
  for (const room of local) {
    const mapping = byLocal.get(room.id);
    if (!mapping) continue;
    try {
      const channelAvail = await provider.getAvailability({
        propertyId: mapping.externalPropertyId,
        roomId: mapping.externalRoomId,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      });
      const available = channelAvail.reduce(
        (min, row) => Math.min(min, row.available),
        Number.POSITIVE_INFINITY,
      );
      const remaining = Number.isFinite(available)
        ? available
        : room.roomsRemaining;
      if (remaining < (params.roomsNeeded ?? 1)) continue;
      const price =
        channelAvail.find((r) => r.pricePerNight != null)?.pricePerNight ??
        room.effectivePrice;
      results.push({
        ...room,
        roomsRemaining: remaining,
        effectivePrice: price,
        estimatedTotal: price * room.nights * (params.roomsNeeded ?? 1),
      });
    } catch (err) {
      await writeChannelSyncLog({
        provider: BEDS24_PROVIDER,
        entityType: "room_type",
        entityId: room.id,
        externalReference: mapping.externalRoomId,
        direction: "OUTBOUND",
        eventType: "availability.search",
        status: "FAILED",
        message: `Availability check failed for ${room.name}`,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return results;
}

/**
 * Final recheck immediately before committing a reservation.
 */
export async function revalidateRoomAvailability(options: {
  roomTypeId: number;
  checkIn: string;
  checkOut: string;
  roomsNeeded: number;
  excludeBookingId?: number;
}): Promise<{
  ok: boolean;
  remaining: number;
  source: "local" | "beds24";
  /** Authoritative nightly rate when channel provides one */
  pricePerNight?: number;
}> {
  const db = getDb();
  const [room] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, options.roomTypeId))
    .limit(1);
  if (!room || !room.isActive) {
    return { ok: false, remaining: 0, source: "local" };
  }

  const localPrice =
    room.promotionalPrice != null && room.promotionalPrice > 0
      ? room.promotionalPrice
      : room.pricePerNight;

  if (!isBeds24Enabled()) {
    const remaining = await getAvailableCount(
      room.id,
      room.inventoryCount,
      options.checkIn,
      options.checkOut,
      options.excludeBookingId,
    );
    return {
      ok: remaining >= options.roomsNeeded,
      remaining,
      source: "local",
      pricePerNight: localPrice,
    };
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
    throw new ChannelManagerError(
      "This room is not mapped to Beds24. Live synchronisation cannot proceed.",
      409,
      "unmapped_room",
    );
  }

  const provider = getChannelManager();
  const channelAvail = await provider.getAvailability({
    propertyId: mapping.externalPropertyId,
    roomId: mapping.externalRoomId,
    checkIn: options.checkIn,
    checkOut: options.checkOut,
  });
  const remaining = channelAvail.reduce(
    (min, row) => Math.min(min, row.available),
    Number.POSITIVE_INFINITY,
  );
  const avail = Number.isFinite(remaining) ? remaining : 0;
  const channelPrice = channelAvail.find((r) => r.pricePerNight != null)
    ?.pricePerNight;
  return {
    ok: avail >= options.roomsNeeded,
    remaining: avail,
    source: "beds24",
    pricePerNight:
      channelPrice != null && Number.isFinite(channelPrice)
        ? channelPrice
        : localPrice,
  };
}
