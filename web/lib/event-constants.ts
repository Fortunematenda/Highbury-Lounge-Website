export const EVENT_CATEGORIES = [
  "Live Music",
  "Dining",
  "Entertainment",
  "Cultural",
  "Corporate",
  "Family",
  "Special Occasion",
  "Other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_STATUSES = [
  "draft",
  "scheduled",
  "published",
  "postponed",
  "cancelled",
  "completed",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const ENTRY_TYPES = ["free", "fixed", "from", "contact"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const ACTION_TYPES = [
  "reserve_table",
  "book_tickets",
  "register",
  "guest_list",
  "enquiry",
  "whatsapp",
  "external",
  "none",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export const RESERVATION_STATUSES = [
  "Pending",
  "Confirmed",
  "Declined",
  "Cancelled",
  "Attended",
  "No Show",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** Guest counts that reserve capacity. */
export const CAPACITY_COUNTING_STATUSES: ReservationStatus[] = [
  "Pending",
  "Confirmed",
  "Attended",
];

export const DEFAULT_VENUE_NAME = "Highbury Lounge";
export const DEFAULT_VENUE_ADDRESS =
  "7504 Greenfield Cherries, Kadoma, Zimbabwe";
export const DEFAULT_TIMEZONE = "Africa/Harare";

export function isEventCategory(value: string): value is EventCategory {
  return (EVENT_CATEGORIES as readonly string[]).includes(value);
}

export function isEventStatus(value: string): value is EventStatus {
  return (EVENT_STATUSES as readonly string[]).includes(value);
}

export function isEntryType(value: string): value is EntryType {
  return (ENTRY_TYPES as readonly string[]).includes(value);
}

export function isActionType(value: string): value is ActionType {
  return (ACTION_TYPES as readonly string[]).includes(value);
}

export function isReservationStatus(value: string): value is ReservationStatus {
  return (RESERVATION_STATUSES as readonly string[]).includes(value);
}

export function actionLabel(
  actionType: string,
  customLabel?: string | null,
): string {
  if (customLabel?.trim()) return customLabel.trim();
  switch (actionType) {
    case "reserve_table":
      return "Reserve a Table";
    case "book_tickets":
      return "Book Tickets";
    case "register":
      return "Register";
    case "guest_list":
      return "Join Guest List";
    case "enquiry":
      return "Send Enquiry";
    case "whatsapp":
      return "WhatsApp Us";
    case "external":
      return "Book Now";
    default:
      return "View Event";
  }
}

export function formatEntryPrice(params: {
  entryType: string;
  price?: number | null;
  currency?: string | null;
  formatMoney: (amount: number, currency?: string) => string;
}): string {
  const { entryType, price, currency = "USD", formatMoney } = params;
  if (entryType === "free") return "Free Entry";
  if (entryType === "contact" || price == null) return "Contact for Price";
  if (entryType === "from") return `From ${formatMoney(price, currency ?? "USD")}`;
  return formatMoney(price, currency ?? "USD");
}

export function availabilityLabel(params: {
  status: string;
  soldOutOverride?: boolean | null;
  trackCapacity?: boolean | null;
  capacity?: number | null;
  reservedGuests?: number | null;
  limitedSpaceThreshold?: number | null;
}): "Available" | "Limited Space" | "Sold Out" | "Postponed" | "Cancelled" {
  if (params.status === "cancelled") return "Cancelled";
  if (params.status === "postponed") return "Postponed";
  if (params.soldOutOverride) return "Sold Out";
  if (params.trackCapacity && params.capacity != null) {
    const remaining = params.capacity - (params.reservedGuests ?? 0);
    if (remaining <= 0) return "Sold Out";
    const threshold = params.limitedSpaceThreshold ?? 10;
    if (remaining <= threshold) return "Limited Space";
  }
  return "Available";
}
