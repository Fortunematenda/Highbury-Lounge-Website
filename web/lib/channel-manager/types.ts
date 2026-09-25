/**
 * Channel manager domain types (provider-agnostic).
 * Beds24 is the first implementation; SiteMinder etc. can plug in later.
 */

export type ChannelProviderKey = "beds24";

export type BookingSource =
  | "DIRECT"
  | "BOOKING_COM"
  | "MANUAL"
  | "OTHER"
  /** Legacy website bookings */
  | "website";

export type SyncStatus = "NOT_SYNCED" | "PENDING" | "SYNCED" | "FAILED";

export type SyncLogDirection = "INBOUND" | "OUTBOUND";

export type SyncLogStatus = "PENDING" | "SUCCESS" | "FAILED" | "RETRYING";

export type ChannelProperty = {
  id: string;
  name: string;
  currency?: string;
};

export type ChannelRoom = {
  id: string;
  propertyId: string;
  name: string;
  qty?: number;
  ratePlanIds?: string[];
};

export type ChannelAvailabilityQuery = {
  propertyId: string;
  roomId?: string;
  checkIn: string;
  checkOut: string;
};

export type ChannelAvailabilityResult = {
  roomId: string;
  propertyId: string;
  available: number;
  currency?: string;
  pricePerNight?: number;
};

export type ChannelRateUpdate = {
  propertyId: string;
  roomId: string;
  from: string;
  to: string;
  price?: number;
  minStay?: number;
  available?: number;
  closed?: boolean;
};

export type ChannelBookingGuest = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

export type ChannelBookingInput = {
  propertyId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  rooms?: number;
  guest: ChannelBookingGuest;
  /** Idempotency key — must not create duplicate provider bookings */
  idempotencyKey: string;
  totalAmount?: number;
  currency?: string;
  notes?: string;
  /** Highbury internal reference for staff */
  localReference?: string;
};

export type ChannelBooking = {
  externalId: string;
  externalReference?: string;
  propertyId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  adults?: number;
  children?: number;
  guest?: ChannelBookingGuest;
  totalAmount?: number;
  currency?: string;
  raw?: unknown;
};

export type ChannelBookingUpdate = {
  externalId: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  notes?: string;
};

export type ChannelWebhookResult = {
  handled: boolean;
  eventType: string;
  externalBookingId?: string;
  message?: string;
};

export type ChannelConnectionTest = {
  ok: boolean;
  message: string;
  propertyId?: string;
  propertyName?: string;
};

export class ChannelManagerError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 502, code = "channel_error") {
    super(message);
    this.name = "ChannelManagerError";
    this.status = status;
    this.code = code;
  }
}
