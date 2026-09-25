import { and, gte, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { todayISODate } from "@/lib/stay-dates";
import { beds24Request } from "./providers/beds24/client";
import {
  BEDS24_PROVIDER,
  getBeds24Config,
  isBeds24Enabled,
} from "./providers/beds24/config";

export type ReconcileState =
  | "Matched"
  | "Highbury Only"
  | "Beds24 Only"
  | "Possible Duplicate"
  | "Conflict";

export type ReconcileRow = {
  state: ReconcileState;
  highburyReference?: string;
  highburyId?: number;
  externalBookingId?: string;
  externalReference?: string;
  checkIn?: string;
  checkOut?: string;
  guestName?: string;
  notes?: string;
};

/**
 * Compare future Highbury bookings with Beds24 (when enabled + credentials).
 * Never auto-merges ambiguous rows.
 */
export async function reconcileChannelBookings(): Promise<{
  enabled: boolean;
  rows: ReconcileRow[];
  message: string;
}> {
  if (!isBeds24Enabled()) {
    return {
      enabled: false,
      rows: [],
      message:
        "Beds24 synchronisation is disabled. Enable BEDS24_ENABLED after configuration to run reconciliation.",
    };
  }

  const config = getBeds24Config();
  if (!config.refreshToken || !config.propertyId) {
    return {
      enabled: true,
      rows: [],
      message: "Beds24 credentials are incomplete.",
    };
  }

  const db = getDb();
  const today = todayISODate();
  const localFuture = await db
    .select()
    .from(bookings)
    .where(
      and(
        gte(bookings.checkOut, today),
        ne(bookings.status, "Cancelled"),
        ne(bookings.status, "Expired"),
        ne(bookings.status, "Declined"),
      ),
    );

  const byExternal = new Map(
    localFuture
      .filter((b) => b.channelManager === BEDS24_PROVIDER && b.externalBookingId)
      .map((b) => [b.externalBookingId!, b] as const),
  );

  const rows: ReconcileRow[] = [];

  for (const b of localFuture) {
    if (b.channelManager === BEDS24_PROVIDER && b.externalBookingId) {
      rows.push({
        state: "Matched",
        highburyId: b.id,
        highburyReference: b.reference,
        externalBookingId: b.externalBookingId,
        externalReference: b.externalBookingReference || undefined,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
      });
      continue;
    }
    rows.push({
      state: "Highbury Only",
      highburyId: b.id,
      highburyReference: b.reference,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      notes:
        b.source === "website" || b.source === "DIRECT" || b.source === "MANUAL"
          ? "Direct/manual Highbury booking — push to Beds24 when ready."
          : undefined,
    });
  }

  try {
    const data = await beds24Request<unknown>("/bookings", {
      query: {
        propertyId: config.propertyId,
        arrivalFrom: today,
      },
    });
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && "data" in data
        ? ((data as { data: unknown }).data as unknown[])
        : [];

    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const extId = String(row.id ?? row.bookId ?? "");
      if (!extId) continue;
      if (byExternal.has(extId)) continue;
      const checkIn = String(row.arrival ?? row.firstNight ?? "");
      const checkOut = String(row.departure ?? row.lastNight ?? "");
      const possible = localFuture.filter(
        (b) =>
          !b.externalBookingId &&
          b.checkIn === checkIn &&
          b.checkOut === checkOut,
      );
      if (possible.length === 1) {
        rows.push({
          state: "Possible Duplicate",
          highburyId: possible[0].id,
          highburyReference: possible[0].reference,
          externalBookingId: extId,
          checkIn,
          checkOut,
          notes:
            "Same dates in Highbury without external id — review before merge.",
        });
      } else if (possible.length > 1) {
        rows.push({
          state: "Conflict",
          externalBookingId: extId,
          checkIn,
          checkOut,
          notes: "Multiple Highbury bookings share these dates.",
        });
      } else {
        rows.push({
          state: "Beds24 Only",
          externalBookingId: extId,
          externalReference: String(row.reference ?? row.apiReference ?? ""),
          checkIn,
          checkOut,
          guestName: [row.firstName, row.lastName].filter(Boolean).join(" "),
        });
      }
    }
  } catch (err) {
    return {
      enabled: true,
      rows,
      message:
        err instanceof Error
          ? `Partial reconcile (Beds24 list failed): ${err.message}`
          : "Partial reconcile — Beds24 list failed.",
    };
  }

  return {
    enabled: true,
    rows,
    message: `Compared ${localFuture.length} future Highbury bookings.`,
  };
}
