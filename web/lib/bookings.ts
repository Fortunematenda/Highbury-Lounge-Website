import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookingGuests,
  bookings,
  bookingStatusHistory,
  roomTypes,
} from "@/db/schema";
import {
  getAvailableCount,
  nightsBetween,
  validateStayDates,
} from "@/lib/availability";
import { getSettingsMap } from "@/lib/settings";
import { queueNotification } from "@/lib/notifications";

export type GuestPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  country?: string;
  specialRequests?: string;
  estimatedArrival?: string;
  termsAccepted: boolean;
};

export type CreateBookingInput = {
  roomTypeId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomsBooked?: number;
  guest: GuestPayload;
};

function bookingReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `HL-${stamp}-${rand}`;
}

export async function createBooking(input: CreateBookingInput) {
  const roomsBooked = input.roomsBooked ?? 1;
  const dateError = validateStayDates(input.checkIn, input.checkOut);
  if (dateError) throw new BookingError(dateError, 400);

  if (!input.guest.termsAccepted) {
    throw new BookingError("You must accept the booking terms.", 400);
  }
  if (!input.guest.firstName?.trim() || !input.guest.lastName?.trim()) {
    throw new BookingError("First and last name are required.", 400);
  }
  if (!input.guest.email?.trim() || !input.guest.phone?.trim()) {
    throw new BookingError("Email and phone are required.", 400);
  }
  if (input.adults < 1) {
    throw new BookingError("At least one adult is required.", 400);
  }
  if (input.children < 0 || roomsBooked < 1) {
    throw new BookingError("Guest or room counts are invalid.", 400);
  }

  const db = getDb();
  const settings = await getSettingsMap();
  const taxRate = Number(settings.tax_rate ?? "0");
  const serviceFeeRate = Number(settings.service_fee_rate ?? "0");
  const currency = settings.currency ?? "USD";
  const pendingHours = Number(settings.pending_expiry_hours ?? "24");

  const [room] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, input.roomTypeId))
    .limit(1);

  if (!room || !room.isActive) {
    throw new BookingError("Selected room is not available.", 404);
  }

  const totalGuests = input.adults + input.children;
  if (totalGuests > room.maxGuests || input.adults > room.maxAdults) {
    throw new BookingError("Guest count exceeds room capacity.", 400);
  }

  const remaining = await getAvailableCount(
    room.id,
    room.inventoryCount,
    input.checkIn,
    input.checkOut,
  );
  if (remaining < roomsBooked) {
    throw new BookingError(
      "Sorry, this room is no longer available for your selected dates. Please choose different dates or another room.",
      409,
    );
  }

  const nights = nightsBetween(input.checkIn, input.checkOut);
  const unitPrice =
    room.promotionalPrice != null && room.promotionalPrice > 0
      ? room.promotionalPrice
      : room.pricePerNight;
  const subtotal = unitPrice * nights * roomsBooked;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const serviceFee = Math.round(subtotal * serviceFeeRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount + serviceFee) * 100) / 100;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + pendingHours);

  const reference = bookingReference();
  const pricingSnapshot = {
    pricePerNight: unitPrice,
    listPrice: room.pricePerNight,
    promotionalPrice: room.promotionalPrice,
    nights,
    roomsBooked,
    taxRate,
    serviceFeeRate,
    currency,
    calculatedAt: new Date().toISOString(),
  };

  // D1 batch as transactional protection for the final insert path
  const insertResult = await db
    .insert(bookings)
    .values({
      reference,
      roomTypeId: room.id,
      roomsBooked,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights,
      adults: input.adults,
      children: input.children,
      status: "Pending",
      currency,
      pricePerNight: unitPrice,
      subtotal,
      taxAmount,
      serviceFee,
      extrasTotal: 0,
      totalAmount,
      pricingSnapshotJson: JSON.stringify(pricingSnapshot),
      specialRequests: input.guest.specialRequests?.trim() || null,
      estimatedArrival: input.guest.estimatedArrival || null,
      termsAccepted: true,
      paymentStatus: "Unpaid",
      expiresAt: expiresAt.toISOString(),
      source: "website",
    })
    .returning();

  const booking = insertResult[0];
  if (!booking) throw new BookingError("Could not create booking.", 500);

  // Re-check after insert to reduce race overbooking
  const remainingAfter = await getAvailableCount(
    room.id,
    room.inventoryCount,
    input.checkIn,
    input.checkOut,
  );
  if (remainingAfter < 0) {
    await db.delete(bookings).where(eq(bookings.id, booking.id));
    throw new BookingError(
      "Sorry, this room just became unavailable. Please try another room or dates.",
      409,
    );
  }

  await db.insert(bookingGuests).values({
    bookingId: booking.id,
    firstName: input.guest.firstName.trim(),
    lastName: input.guest.lastName.trim(),
    email: input.guest.email.trim().toLowerCase(),
    phone: input.guest.phone.trim(),
    whatsapp: input.guest.whatsapp?.trim() || null,
    country: input.guest.country?.trim() || null,
    isPrimary: true,
  });

  await db.insert(bookingStatusHistory).values({
    bookingId: booking.id,
    previousStatus: null,
    newStatus: "Pending",
    note: "Guest submitted reservation request",
  });

  await queueNotification({
    templateKey: "booking_received",
    recipientEmail: input.guest.email.trim().toLowerCase(),
    recipientName: `${input.guest.firstName} ${input.guest.lastName}`.trim(),
    context: {
      guestName: `${input.guest.firstName} ${input.guest.lastName}`.trim(),
      reference,
      roomName: room.name,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: `${input.adults} adult(s), ${input.children} child(ren)`,
      total: `${currency} ${totalAmount.toFixed(2)}`,
      status: "Pending",
    },
    relatedType: "booking",
    relatedId: booking.id,
  });

  return booking;
}

export async function updateBookingStatus(params: {
  bookingId: number;
  newStatus: string;
  adminUserId?: number;
  note?: string;
}) {
  const db = getDb();
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, params.bookingId))
    .limit(1);
  if (!booking) throw new BookingError("Booking not found.", 404);

  await db
    .update(bookings)
    .set({ status: params.newStatus, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(bookings.id, params.bookingId));

  await db.insert(bookingStatusHistory).values({
    bookingId: params.bookingId,
    previousStatus: booking.status,
    newStatus: params.newStatus,
    adminUserId: params.adminUserId ?? null,
    note: params.note ?? null,
  });

  const [guest] = await db
    .select()
    .from(bookingGuests)
    .where(eq(bookingGuests.bookingId, params.bookingId))
    .limit(1);
  const [room] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, booking.roomTypeId))
    .limit(1);

  const templateMap: Record<string, string> = {
    Confirmed: "booking_confirmed",
    Declined: "booking_declined",
    "Awaiting Payment": "awaiting_payment",
    Cancelled: "booking_cancelled",
  };
  const templateKey = templateMap[params.newStatus];
  if (templateKey && guest) {
    await queueNotification({
      templateKey,
      recipientEmail: guest.email,
      recipientName: `${guest.firstName} ${guest.lastName}`,
      context: {
        guestName: `${guest.firstName} ${guest.lastName}`,
        reference: booking.reference,
        roomName: room?.name ?? "Room",
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: `${booking.adults} adult(s), ${booking.children} child(ren)`,
        total: `${booking.currency} ${booking.totalAmount.toFixed(2)}`,
        status: params.newStatus,
      },
      relatedType: "booking",
      relatedId: booking.id,
    });
  }

  return { ...booking, status: params.newStatus };
}

export class BookingError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
