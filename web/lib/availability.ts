import { and, asc, eq, gt, inArray, lt, ne, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookings,
  roomBlocks,
  roomTypes,
  roomImages,
  roomTypeAmenities,
  amenities,
} from "@/db/schema";
import { getSettingsMap } from "@/lib/settings";
import { nightsBetween } from "@/lib/stay-dates";

export {
  nightsBetween,
  todayISODate,
  validateStayDates,
} from "@/lib/stay-dates";

export const ACTIVE_BOOKING_STATUSES = [
  "Pending",
  "Awaiting Payment",
  "Confirmed",
  "Checked In",
] as const;

export const INACTIVE_BOOKING_STATUSES = [
  "Declined",
  "Cancelled",
  "Checked Out",
  "No Show",
  "Expired",
] as const;

export type BookingStatus =
  | (typeof ACTIVE_BOOKING_STATUSES)[number]
  | (typeof INACTIVE_BOOKING_STATUSES)[number];

/** Overlap: existingCheckIn < requestedCheckOut AND existingCheckOut > requestedCheckIn */
export function dateOverlapSql(
  existingStart: typeof bookings.checkIn | typeof roomBlocks.startDate,
  existingEnd: typeof bookings.checkOut | typeof roomBlocks.endDate,
  requestedCheckIn: string,
  requestedCheckOut: string,
): SQL {
  return and(
    lt(existingStart, requestedCheckOut),
    gt(existingEnd, requestedCheckIn),
  )!;
}

export async function expireStalePendingBookings() {
  const db = getDb();
  const now = new Date().toISOString();
  const stale = await db
    .select({ id: bookings.id, status: bookings.status })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "Pending"),
        lt(bookings.expiresAt, now),
      ),
    );

  for (const row of stale) {
    await db
      .update(bookings)
      .set({ status: "Expired", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(bookings.id, row.id));
  }

  return stale.length;
}

export async function getOccupiedCount(
  roomTypeId: number,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: number,
): Promise<number> {
  const db = getDb();
  await expireStalePendingBookings();

  const bookingConditions: SQL[] = [
    eq(bookings.roomTypeId, roomTypeId),
    inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
    dateOverlapSql(bookings.checkIn, bookings.checkOut, checkIn, checkOut),
  ];
  if (excludeBookingId) {
    bookingConditions.push(ne(bookings.id, excludeBookingId));
  }

  const bookingRows = await db
    .select({ rooms: bookings.roomsBooked })
    .from(bookings)
    .where(and(...bookingConditions));

  const blockRows = await db
    .select({ rooms: roomBlocks.roomsBlocked })
    .from(roomBlocks)
    .where(
      and(
        eq(roomBlocks.roomTypeId, roomTypeId),
        dateOverlapSql(
          roomBlocks.startDate,
          roomBlocks.endDate,
          checkIn,
          checkOut,
        ),
      ),
    );

  const booked = bookingRows.reduce((sum, r) => sum + r.rooms, 0);
  const blocked = blockRows.reduce((sum, r) => sum + r.rooms, 0);
  return booked + blocked;
}

export async function getAvailableCount(
  roomTypeId: number,
  inventoryCount: number,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: number,
): Promise<number> {
  const occupied = await getOccupiedCount(
    roomTypeId,
    checkIn,
    checkOut,
    excludeBookingId,
  );
  return Math.max(0, inventoryCount - occupied);
}

export type AvailableRoom = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  translationsJson: string | null;
  description: string | null;
  pricePerNight: number;
  promotionalPrice: number | null;
  effectivePrice: number;
  currency: string;
  inventoryCount: number;
  roomsRemaining: number;
  maxAdults: number;
  maxChildren: number;
  maxGuests: number;
  bedType: string | null;
  roomSize: string | null;
  featuredImage: string | null;
  images: string[];
  amenities: string[];
  nights: number;
  estimatedTotal: number;
};

export async function findAvailableRooms(params: {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomsNeeded?: number;
}): Promise<AvailableRoom[]> {
  const {
    checkIn,
    checkOut,
    adults,
    children,
    roomsNeeded = 1,
  } = params;
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return [];

  const db = getDb();
  const types = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.isActive, true))
    .orderBy(asc(roomTypes.displayOrder), asc(roomTypes.pricePerNight));

  const settings = await getSettingsMap();
  const currency = settings.currency || "USD";

  const results: AvailableRoom[] = [];

  for (const room of types) {
    const totalGuests = adults + children;
    if (room.maxGuests < totalGuests) continue;
    if (room.maxAdults < adults) continue;
    if (room.maxChildren < children) continue;

    const remaining = await getAvailableCount(
      room.id,
      room.inventoryCount,
      checkIn,
      checkOut,
    );
    if (remaining < roomsNeeded) continue;

    const images = await db
      .select()
      .from(roomImages)
      .where(eq(roomImages.roomTypeId, room.id))
      .orderBy(asc(roomImages.displayOrder));
    const amenityRows = await db
      .select({ name: amenities.name })
      .from(roomTypeAmenities)
      .innerJoin(amenities, eq(roomTypeAmenities.amenityId, amenities.id))
      .where(eq(roomTypeAmenities.roomTypeId, room.id));

    const effectivePrice =
      room.promotionalPrice != null && room.promotionalPrice > 0
        ? room.promotionalPrice
        : room.pricePerNight;

    results.push({
      id: room.id,
      name: room.name,
      slug: room.slug,
      shortDescription: room.shortDescription,
      description: room.description,
      translationsJson: room.translationsJson ?? null,
      pricePerNight: room.pricePerNight,
      promotionalPrice: room.promotionalPrice,
      effectivePrice,
      currency,
      inventoryCount: room.inventoryCount,
      roomsRemaining: remaining,
      maxAdults: room.maxAdults,
      maxChildren: room.maxChildren,
      maxGuests: room.maxGuests,
      bedType: room.bedType,
      roomSize: room.roomSize,
      featuredImage: room.featuredImage,
      images: images.map((i) => i.url),
      amenities: amenityRows.map((a) => a.name),
      nights,
      estimatedTotal: effectivePrice * nights * roomsNeeded,
    });
  }

  return results;
}
