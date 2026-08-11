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

/** Current venue-local timestamp YYYY-MM-DDTHH:mm:ss. */
export function nowVenueIso(timeZone = VENUE_TIMEZONE): string {
  return formatWallClock(new Date(), timeZone);
}

/** Absolute UTC ISO for DB createdAt/updatedAt columns. */
export function nowUtcIso(): string {
  return new Date().toISOString();
}

/** Midnight today in venue-local floating ISO. */
export function todayVenueStartIso(timeZone = VENUE_TIMEZONE): string {
  return `${todayVenueDate(timeZone)}T00:00:00`;
}

/**
 * Parse DB / event timestamps.
 * Values without a timezone offset are treated as UTC (legacy SQLite / mistaken
 * floating UTC stores), so Africa/Harare display is +2 hours, not 2 behind.
 */
export function parseDbTimestamp(iso: string | null | undefined): Date | null {
  const raw = (iso || "").trim();
  if (!raw) return null;

  let normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  if (!/([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized)) {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(normalized)) {
      normalized = `${normalized}Z`;
    }
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Convert any stored event instant to Africa/Harare wall-clock (no offset).
 * Use for display and datetime-local inputs.
 */
export function toVenueWallClock(
  iso: string | null | undefined,
  timeZone = VENUE_TIMEZONE,
): string {
  const date = parseDbTimestamp(iso);
  if (!date) return "";
  return formatWallClock(date, timeZone);
}

/**
 * Interpret a datetime-local value as Africa/Harare and store as UTC ISO.
 * Example: 2026-09-05T20:00 → 2026-09-05T18:00:00.000Z
 */
export function fromVenueWallClock(wall: string | null | undefined): string {
  const raw = (wall || "").trim();
  if (!raw) return "";
  let normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  if (normalized.length === 16) normalized = `${normalized}:00`;
  normalized = normalized.slice(0, 19);
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized)) {
    const absolute = new Date(normalized);
    return Number.isNaN(absolute.getTime()) ? "" : absolute.toISOString();
  }
  // CAT is UTC+2 year-round (no DST).
  const withOffset = `${normalized}+02:00`;
  const date = new Date(withOffset);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** Ensure an event instant is stored as UTC ISO (with Z). */
export function toUtcIso(iso: string | null | undefined): string {
  const date = parseDbTimestamp(iso);
  if (!date) return "";
  return date.toISOString();
}

/** Friendly date+time in venue timezone for DB timestamps like createdAt. */
export function formatVenueDateTime(
  iso: string | null | undefined,
  opts?: { withSeconds?: boolean },
): string {
  if (!iso) return "";
  const date = parseDbTimestamp(iso);
  if (!date) return String(iso).replace("T", " ").slice(0, 19);
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

/** Relative time from a DB timestamp (UTC-safe). */
export function formatVenueDistanceToNow(
  iso: string | null | undefined,
  formatDistanceToNow: (
    date: Date | number,
    options?: { addSuffix?: boolean },
  ) => string,
): string {
  const date = parseDbTimestamp(iso);
  if (!date) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}
