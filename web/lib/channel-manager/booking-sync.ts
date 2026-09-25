import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookingGuests,
  bookings,
  channelRoomMappings,
  roomTypes,
} from "@/db/schema";
import { writeChannelSyncLog } from "./sync-log";
import { BEDS24_PROVIDER, isBeds24Enabled } from "./providers/beds24/config";
import { getChannelManager } from "./factory";
import { ChannelManagerError } from "./types";

export type InboundBookingPayload = {
  externalBookingId: string;
  externalReference?: string;
  externalRoomId: string;
  externalPropertyId?: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  status?: string;
  totalAmount?: number;
  currency?: string;
  guest?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  /** Heuristic channel label from Beds24 / OTA */
  channelName?: string;
};

function mapInboundSource(channelName?: string): string {
  const n = (channelName || "").toLowerCase();
  if (n.includes("booking.com") || n.includes("bookingcom")) return "BOOKING_COM";
  if (!n || n.includes("beds24") || n.includes("direct")) return "OTHER";
  return "BOOKING_COM";
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T12:00:00Z`).getTime();
  const b = new Date(`${checkOut}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

/**
 * Idempotent upsert of an inbound channel booking into Highbury.
 * Duplicate external ids update the same row — never create a second booking.
 */
export async function upsertInboundChannelBooking(
  payload: InboundBookingPayload,
) {
  if (!payload.externalBookingId) {
    throw new ChannelManagerError("Missing external booking id.", 400);
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.channelManager, BEDS24_PROVIDER),
        eq(bookings.externalBookingId, payload.externalBookingId),
      ),
    )
    .limit(1);

  const mappingConditions = [
    eq(channelRoomMappings.provider, BEDS24_PROVIDER),
    eq(channelRoomMappings.externalRoomId, payload.externalRoomId),
    eq(channelRoomMappings.enabled, true),
  ];
  if (payload.externalPropertyId) {
    mappingConditions.push(
      eq(channelRoomMappings.externalPropertyId, payload.externalPropertyId),
    );
  }

  const [mapping] = await db
    .select()
    .from(channelRoomMappings)
    .where(and(...mappingConditions))
    .limit(1);

  if (!mapping) {
    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "booking",
      externalReference: payload.externalBookingId,
      direction: "INBOUND",
      eventType: "booking.inbound",
      status: "FAILED",
      message: "No Highbury room mapping for inbound Beds24 room.",
      error: `unmapped_room:${payload.externalRoomId}`,
    });
    throw new ChannelManagerError(
      "Inbound booking room is not mapped in Highbury.",
      409,
      "unmapped_room",
    );
  }

  const [room] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, mapping.localRoomTypeId))
    .limit(1);
  if (!room) {
    throw new ChannelManagerError("Mapped room type missing.", 500);
  }

  const cancelled =
    (payload.status || "").toLowerCase().includes("cancel") ||
    (payload.status || "").toLowerCase() === "0";

  const nights = nightsBetween(payload.checkIn, payload.checkOut);
  const unit =
    room.promotionalPrice != null && room.promotionalPrice > 0
      ? room.promotionalPrice
      : room.pricePerNight;
  const total =
    payload.totalAmount != null ? payload.totalAmount : unit * nights;
  const source = mapInboundSource(payload.channelName);

  if (existing[0]) {
    const [updated] = await db
      .update(bookings)
      .set({
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        nights,
        adults: payload.adults ?? existing[0].adults,
        children: payload.children ?? existing[0].children,
        status: cancelled ? "Cancelled" : existing[0].status,
        totalAmount: total,
        currency: payload.currency || existing[0].currency,
        externalBookingReference:
          payload.externalReference || existing[0].externalBookingReference,
        syncStatus: "SYNCED",
        lastSyncedAt: new Date().toISOString(),
        lastSyncError: null,
        source,
      })
      .where(eq(bookings.id, existing[0].id))
      .returning();

    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "booking",
      entityId: updated.id,
      externalReference: payload.externalBookingId,
      direction: "INBOUND",
      eventType: cancelled ? "booking.cancelled" : "booking.modified",
      status: "SUCCESS",
      message: "Updated existing Highbury booking from channel webhook.",
    });
    return { booking: updated, created: false };
  }

  const stamp = Date.now().toString(36).toUpperCase();
  const reference = `CH-${stamp}-${payload.externalBookingId.slice(-4)}`;

  const [created] = await db
    .insert(bookings)
    .values({
      reference,
      roomTypeId: room.id,
      roomsBooked: 1,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      nights,
      adults: payload.adults ?? 1,
      children: payload.children ?? 0,
      status: cancelled ? "Cancelled" : "Confirmed",
      currency: payload.currency || "USD",
      pricePerNight: unit,
      subtotal: total,
      taxAmount: 0,
      serviceFee: 0,
      extrasTotal: 0,
      totalAmount: total,
      termsAccepted: true,
      paymentStatus: "Paid",
      source,
      channelManager: BEDS24_PROVIDER,
      externalBookingId: payload.externalBookingId,
      externalBookingReference: payload.externalReference || null,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date().toISOString(),
      lastSyncError: null,
    })
    .returning();

  await db.insert(bookingGuests).values({
    bookingId: created.id,
    firstName: payload.guest?.firstName?.trim() || "Guest",
    lastName: payload.guest?.lastName?.trim() || "Channel",
    email: payload.guest?.email?.trim() || "channel@highbury-lounge.local",
    phone: payload.guest?.phone?.trim() || "n/a",
    isPrimary: true,
  });

  await writeChannelSyncLog({
    provider: BEDS24_PROVIDER,
    entityType: "booking",
    entityId: created.id,
    externalReference: payload.externalBookingId,
    direction: "INBOUND",
    eventType: "booking.created",
    status: "SUCCESS",
    message: "Created Highbury booking from channel webhook.",
  });

  return { booking: created, created: true };
}

/**
 * Outbound push of a Highbury booking to Beds24 (no-op when disabled).
 * Idempotent: if externalBookingId already set, skips create.
 */
export async function syncBookingOutboundIfEnabled(bookingId: number) {
  if (!isBeds24Enabled()) {
    return { synced: false, reason: "disabled" as const };
  }

  const db = getDb();
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return { synced: false, reason: "missing" as const };

  if (booking.externalBookingId) {
    return {
      synced: true,
      reason: "already_synced" as const,
      externalId: booking.externalBookingId,
    };
  }

  const [mapping] = await db
    .select()
    .from(channelRoomMappings)
    .where(
      and(
        eq(channelRoomMappings.provider, BEDS24_PROVIDER),
        eq(channelRoomMappings.localRoomTypeId, booking.roomTypeId),
        eq(channelRoomMappings.enabled, true),
      ),
    )
    .limit(1);

  if (!mapping) {
    await db
      .update(bookings)
      .set({
        syncStatus: "FAILED",
        lastSyncError: "Room is not mapped to Beds24.",
      })
      .where(eq(bookings.id, bookingId));
    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "booking",
      entityId: bookingId,
      direction: "OUTBOUND",
      eventType: "booking.create",
      status: "FAILED",
      error: "unmapped_room",
    });
    return { synced: false, reason: "unmapped" as const };
  }

  const [guest] = await db
    .select()
    .from(bookingGuests)
    .where(eq(bookingGuests.bookingId, bookingId))
    .limit(1);

  await db
    .update(bookings)
    .set({ syncStatus: "PENDING", lastSyncError: null })
    .where(eq(bookings.id, bookingId));

  try {
    const provider = getChannelManager();
    const created = await provider.createBooking({
      propertyId: mapping.externalPropertyId,
      roomId: mapping.externalRoomId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      adults: booking.adults,
      children: booking.children,
      rooms: booking.roomsBooked,
      guest: {
        firstName: guest?.firstName || "Guest",
        lastName: guest?.lastName || "Highbury",
        email: guest?.email,
        phone: guest?.phone,
      },
      idempotencyKey: `HL-${booking.reference}`,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      localReference: booking.reference,
    });

    await db
      .update(bookings)
      .set({
        channelManager: BEDS24_PROVIDER,
        externalBookingId: created.externalId,
        externalBookingReference: created.externalReference || null,
        syncStatus: "SYNCED",
        lastSyncedAt: new Date().toISOString(),
        lastSyncError: null,
      })
      .where(eq(bookings.id, bookingId));

    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "booking",
      entityId: bookingId,
      externalReference: created.externalId,
      direction: "OUTBOUND",
      eventType: "booking.create",
      status: "SUCCESS",
      message: "Pushed Highbury booking to Beds24.",
    });

    return { synced: true, reason: "created" as const, externalId: created.externalId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Beds24 sync failed";
    await db
      .update(bookings)
      .set({
        syncStatus: "FAILED",
        lastSyncError: message,
      })
      .where(eq(bookings.id, bookingId));
    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "booking",
      entityId: bookingId,
      direction: "OUTBOUND",
      eventType: "booking.create",
      status: "FAILED",
      error: message,
    });
    return { synced: false, reason: "error" as const, error: message };
  }
}

/**
 * Cancel (or release) a Highbury booking on Beds24 when live sync is enabled.
 * No-op when disabled or when the booking was never pushed.
 */
export async function cancelBookingOutboundIfEnabled(
  bookingId: number,
  reason?: string,
) {
  if (!isBeds24Enabled()) {
    return { cancelled: false, reason: "disabled" as const };
  }

  const db = getDb();
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking?.externalBookingId) {
    return { cancelled: false, reason: "not_synced" as const };
  }

  try {
    const provider = getChannelManager();
    await provider.cancelBooking(
      booking.externalBookingId,
      reason || "Cancelled in Highbury",
    );
    await db
      .update(bookings)
      .set({
        syncStatus: "SYNCED",
        lastSyncedAt: new Date().toISOString(),
        lastSyncError: null,
      })
      .where(eq(bookings.id, bookingId));
    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "booking",
      entityId: bookingId,
      externalReference: booking.externalBookingId,
      direction: "OUTBOUND",
      eventType: "booking.cancel",
      status: "SUCCESS",
      message: reason || "Cancelled on Beds24",
    });
    return { cancelled: true, reason: "ok" as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Beds24 cancel failed";
    await db
      .update(bookings)
      .set({
        syncStatus: "FAILED",
        lastSyncError: message,
      })
      .where(eq(bookings.id, bookingId));
    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "booking",
      entityId: bookingId,
      externalReference: booking.externalBookingId,
      direction: "OUTBOUND",
      eventType: "booking.cancel",
      status: "FAILED",
      error: message,
    });
    return { cancelled: false, reason: "error" as const, error: message };
  }
}
