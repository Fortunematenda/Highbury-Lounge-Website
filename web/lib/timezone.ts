/** Venue / business timezone for Highbury Lounge (CAT, UTC+2, no DST). */
export const VENUE_TIMEZONE = "Africa/Harare";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Format an absolute instant as a floating wall-clock string in a timezone:
 * YYYY-MM-DDTHH:mm:ss
 */
export function formatWallClock(
  date: Date,
  timeZone = VENUE_TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

/** Today's date YYYY-MM-DD in the venue timezone. */
export function todayVenueDate(timeZone = VENUE_TIMEZONE): string {
  return formatWallClock(new Date(), timeZone).slice(0, 10);
}

/** Current venue-local timestamp YYYY-MM-DDTHH:mm:ss */
export function nowVenueIso(timeZone = VENUE_TIMEZONE): string {
  return formatWallClock(new Date(), timeZone);
}

/** Midnight today in venue-local floating ISO. */
export function todayVenueStartIso(timeZone = VENUE_TIMEZONE): string {
  return `${todayVenueDate(timeZone)}T00:00:00`;
}

/**
 * Normalize event datetime strings for display/storage as venue wall-clock.
 * - Floating values (no Z/offset) are kept as entered (venue local).
 * - Absolute UTC/offset values are converted into Africa/Harare wall-clock
 *   so they are not shown 2 hours behind.
 */
export function toVenueWallClock(
  iso: string | null | undefined,
  timeZone = VENUE_TIMEZONE,
): string {
  const raw = (iso || "").trim();
  if (!raw) return "";

  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasOffset = /([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized);

  if (hasOffset) {
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return normalized.slice(0, 19);
    return formatWallClock(date, timeZone);
  }

  // Strip millis / trailing junk: 2026-09-05T20:00:00.000 → 2026-09-05T20:00:00
  const [datePart = "", timePart = "00:00:00"] = normalized.split("T");
  const [hh = "00", mm = "00", ss = "00"] = timePart.split(":");
  const seconds = pad(Number.parseInt(ss, 10) || 0);
  return `${datePart}T${pad(Number.parseInt(hh, 10) || 0)}:${pad(Number.parseInt(mm, 10) || 0)}:${seconds}`;
}

/** Friendly date+time in venue timezone for timestamps like createdAt. */
export function formatVenueDateTime(
  iso: string | null | undefined,
  opts?: { withSeconds?: boolean },
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return toVenueWallClock(iso).replace("T", " ");
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VENUE_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: opts?.withSeconds ? "2-digit" : undefined,
    hourCycle: "h23",
  }).format(date);
}
