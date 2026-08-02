/** Client-safe stay date helpers (no DB imports). */

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function todayISODate(timeZone = "Africa/Harare"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function validateStayDates(
  checkIn: string,
  checkOut: string,
  today = todayISODate(),
): string | null {
  if (!checkIn || !checkOut) return "Check-in and check-out dates are required.";
  if (checkIn < today) return "Check-in cannot be in the past.";
  if (checkOut <= checkIn) return "Check-out must be after check-in.";
  return null;
}
