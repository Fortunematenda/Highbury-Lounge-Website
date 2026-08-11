import {
  Briefcase,
  Gift,
  Landmark,
  type LucideIcon,
  Music2,
  PartyPopper,
  Sparkles,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { actionLabel } from "@/lib/event-constants";

export type ProgrammeItem = { time: string; title: string; detail?: string };

export type EventAvailability =
  | "Available"
  | "Limited Space"
  | "Sold Out"
  | "Postponed"
  | "Cancelled";

/** Mirrors the shape returned by `toPublicEvent()` in `@/lib/events`. */
export type PublicEvent = {
  id: number;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  category: string;
  artistOrHost: string | null;
  venueName: string | null;
  venueAddress: string | null;
  startAt: string;
  endAt: string | null;
  timezone: string | null;
  coverImage: string | null;
  posterImage: string | null;
  gallery: string[];
  entryType: string;
  currency: string | null;
  price: number | null;
  priceLabel: string;
  capacity: number | null;
  remaining: number | null;
  trackCapacity: boolean;
  actionType: string;
  customActionLabel: string | null;
  externalBookingUrl: string | null;
  enableOnlineReservations: boolean;
  minGuests: number;
  maxGuestsPerReservation: number;
  programme: ProgrammeItem[];
  dressCode: string | null;
  ageNote: string | null;
  attendanceInfo: string | null;
  status: string;
  isFeatured: boolean;
  showAnnouncement: boolean;
  availability: EventAvailability;
  canReserve: boolean;
  canBuyTickets: boolean;
  ticketTypes?: Array<{
    id: number;
    name: string;
    description: string | null;
    currency: string;
    price: number;
  }>;
  seoTitle: string | null;
  seoDescription: string | null;
  socialImage: string | null;
};

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Live Music": Music2,
  Dining: UtensilsCrossed,
  Entertainment: PartyPopper,
  Cultural: Landmark,
  Corporate: Briefcase,
  Family: Users,
  "Special Occasion": Gift,
  Other: Sparkles,
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Event `startAt`/`endAt` values are stored as "floating" local wall-clock
 * strings (YYYY-MM-DDTHH:mm:ss) in the venue timezone. We parse the parts
 * directly and format via UTC so the displayed time never shifts based on
 * the visitor's browser timezone.
 */
function parseParts(iso: string | null | undefined) {
  const [datePart = "", timePart = "00:00:00"] = (iso || "").split("T");
  const [y, m, d] = datePart.split("-").map((n) => Number(n) || 0);
  const [hh = 0, mm = 0] = timePart.split(":").map((n) => Number(n) || 0);
  return { y, m, d, hh, mm };
}

function weekdayIndex(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, Math.max(0, m - 1), d || 1)).getUTCDay();
}

export function formatEventWeekday(iso: string, long = false): string {
  const { y, m, d } = parseParts(iso);
  if (!y) return "";
  const idx = weekdayIndex(y, m, d);
  return long ? WEEKDAYS_LONG[idx] : WEEKDAYS[idx];
}

export function formatEventDayNumber(iso: string): string {
  const { d } = parseParts(iso);
  return d ? String(d).padStart(2, "0") : "--";
}

export function formatEventMonth(iso: string, long = false): string {
  const { m } = parseParts(iso);
  if (!m) return "";
  return long ? MONTHS_LONG[m - 1] : MONTHS[m - 1];
}

export function formatEventDate(
  iso: string,
  opts?: { withYear?: boolean; withWeekday?: boolean; long?: boolean },
): string {
  const { y, d } = parseParts(iso);
  if (!y) return "";
  const weekday = opts?.withWeekday
    ? `${formatEventWeekday(iso, opts.long)}, `
    : "";
  const month = formatEventMonth(iso, opts?.long);
  const year = opts?.withYear ? ` ${y}` : "";
  return `${weekday}${d} ${month}${year}`;
}

export function formatEventTime(iso: string): string {
  const { hh, mm } = parseParts(iso);
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, "0")} ${period}`;
}

export function formatEventDateTime(iso: string): string {
  return `${formatEventDate(iso, { withYear: true })} · ${formatEventTime(iso)}`;
}

export function formatEventTimeRange(
  startIso: string,
  endIso?: string | null,
): string {
  const start = formatEventTime(startIso);
  if (!endIso) return start;
  const sameDay = startIso.slice(0, 10) === endIso.slice(0, 10);
  if (sameDay) return `${start} – ${formatEventTime(endIso)}`;
  return `${start} – ${formatEventDate(endIso, { withYear: true })}, ${formatEventTime(endIso)}`;
}

/** Current local date at midnight, in the same "floating" ISO shape used for event dates. */
function nowLocalDateIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00:00`;
}

export function isEventPast(startAt: string): boolean {
  return startAt < nowLocalDateIso();
}

export function whatsappHref(
  phone: string | null | undefined,
  message: string,
): string {
  const digits = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits || "263786957068"}?text=${encodeURIComponent(message)}`;
}

export function eventMapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/**
 * Wide website image for cards and heroes.
 * Prefer cover (banner); fall back to poster.
 */
export function eventBannerImage(
  event: Pick<PublicEvent, "coverImage" | "posterImage">,
  fallback = "/images/events.jpg",
): string {
  return event.coverImage || event.posterImage || fallback;
}

/**
 * Flyer / social poster. Prefer poster; fall back to cover.
 */
export function eventPosterImage(
  event: Pick<PublicEvent, "coverImage" | "posterImage">,
  fallback = "/images/events.jpg",
): string {
  return event.posterImage || event.coverImage || fallback;
}

/** @deprecated Prefer eventBannerImage for cards/heroes. */
export function eventImage(
  event: Pick<PublicEvent, "coverImage" | "posterImage">,
  fallback = "/images/events.jpg",
): string {
  return eventBannerImage(event, fallback);
}

export type CardAction =
  | { kind: "reserve"; label: string }
  | { kind: "tickets"; label: string }
  | { kind: "whatsapp"; label: string; href: string }
  | { kind: "external"; label: string; href: string }
  | { kind: "details"; label: string };

/** Decides the primary call-to-action for an event card / detail sticky bar. */
export function resolveEventAction(
  event: PublicEvent,
  whatsappNumber?: string,
): CardAction {
  if (event.canBuyTickets) {
    return {
      kind: "tickets",
      label: actionLabel(event.actionType, event.customActionLabel),
    };
  }
  if (event.canReserve) {
    return {
      kind: "reserve",
      label: actionLabel(event.actionType, event.customActionLabel),
    };
  }
  if (event.actionType === "whatsapp" && !isEventPast(event.startAt)) {
    return {
      kind: "whatsapp",
      label: actionLabel(event.actionType, event.customActionLabel),
      href: whatsappHref(
        whatsappNumber,
        `Hi Highbury Lounge, I'd like to know more about "${event.title}" on ${formatEventDate(
          event.startAt,
          { withYear: true },
        )}.`,
      ),
    };
  }
  if (
    event.actionType === "external" &&
    event.externalBookingUrl &&
    !isEventPast(event.startAt)
  ) {
    return {
      kind: "external",
      label: actionLabel(event.actionType, event.customActionLabel),
      href: event.externalBookingUrl,
    };
  }
  return { kind: "details", label: "View Details" };
}
