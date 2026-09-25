import type { BookingSource, SyncStatus } from "./types";

const SOURCE_LABELS: Record<string, string> = {
  website: "Direct Website",
  DIRECT: "Direct Website",
  BOOKING_COM: "Booking.com",
  MANUAL: "Manual",
  OTHER: "Other",
};

const SYNC_LABELS: Record<SyncStatus, string> = {
  NOT_SYNCED: "Not synced",
  PENDING: "Pending",
  SYNCED: "Synced",
  FAILED: "Failed",
};

export function normalizeBookingSource(raw: string | null | undefined): string {
  if (!raw) return "DIRECT";
  if (raw === "website") return "DIRECT";
  return raw;
}

export function bookingSourceLabel(raw: string | null | undefined): string {
  const key = raw || "DIRECT";
  return SOURCE_LABELS[key] || SOURCE_LABELS[normalizeBookingSource(key)] || key;
}

export function syncStatusLabel(raw: string | null | undefined): string {
  const key = (raw || "NOT_SYNCED") as SyncStatus;
  return SYNC_LABELS[key] || raw || "Not synced";
}

export function isChannelSyncedSource(source: string | null | undefined): boolean {
  return normalizeBookingSource(source) === "BOOKING_COM";
}

export type { BookingSource, SyncStatus };
