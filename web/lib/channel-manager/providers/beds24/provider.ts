import type { ChannelManagerProvider } from "../../provider";
import {
  ChannelManagerError,
  type ChannelAvailabilityQuery,
  type ChannelAvailabilityResult,
  type ChannelBooking,
  type ChannelBookingInput,
  type ChannelBookingUpdate,
  type ChannelConnectionTest,
  type ChannelProperty,
  type ChannelRateUpdate,
  type ChannelRoom,
  type ChannelWebhookResult,
} from "../../types";
import { beds24Request } from "./client";
import {
  BEDS24_PROVIDER,
  getBeds24Config,
  isBeds24Enabled,
  requireBeds24Enabled,
} from "./config";

function assertLiveSyncAllowed(action: string) {
  if (!isBeds24Enabled()) {
    throw new ChannelManagerError(
      `Beds24 synchronisation is disabled (${action}).`,
      503,
      "beds24_disabled",
    );
  }
  requireBeds24Enabled();
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && "data" in value) {
    const data = (value as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function mapBooking(raw: Record<string, unknown>): ChannelBooking {
  const id = String(raw.id ?? raw.bookId ?? raw.bookingId ?? "");
  return {
    externalId: id,
    externalReference: String(raw.reference ?? raw.apiReference ?? raw.bookId ?? id),
    propertyId: String(raw.propertyId ?? raw.propId ?? ""),
    roomId: String(raw.roomId ?? ""),
    checkIn: String(raw.arrival ?? raw.firstNight ?? raw.checkIn ?? ""),
    checkOut: String(raw.departure ?? raw.lastNight ?? raw.checkOut ?? ""),
    status: String(raw.status ?? raw.bookingStatus ?? "unknown"),
    adults: Number(raw.numAdult ?? raw.adults ?? 0) || undefined,
    children: Number(raw.numChild ?? raw.children ?? 0) || undefined,
    guest: {
      firstName: String(raw.firstName ?? raw.guestFirstName ?? ""),
      lastName: String(raw.lastName ?? raw.guestName ?? ""),
      email: raw.email ? String(raw.email) : undefined,
      phone: raw.mobile || raw.phone ? String(raw.mobile ?? raw.phone) : undefined,
    },
    totalAmount:
      raw.price != null
        ? Number(raw.price)
        : raw.invoiceePrice != null
          ? Number(raw.invoiceePrice)
          : undefined,
    currency: raw.currency ? String(raw.currency) : undefined,
    raw,
  };
}

/**
 * Beds24 API V2 provider.
 * Live mutating calls are gated by BEDS24_ENABLED; testConnection may run
 * when credentials exist even if sync is still off (admin health checks).
 */
export class Beds24Provider implements ChannelManagerProvider {
  readonly key = BEDS24_PROVIDER;

  async testConnection(): Promise<ChannelConnectionTest> {
    const config = getBeds24Config();
    if (!config.refreshToken) {
      return {
        ok: false,
        message:
          "Refresh token not configured. Generate an invite code in Beds24 Marketplace → API, exchange it for a refresh token, then set BEDS24_REFRESH_TOKEN.",
      };
    }
    if (!config.propertyId) {
      return {
        ok: false,
        message:
          "BEDS24_PROPERTY_ID is not set. Enter the Beds24 property id after verification.",
      };
    }
    try {
      const props = await this.getProperties();
      const match = props.find((p) => p.id === config.propertyId) ?? props[0];
      return {
        ok: true,
        message: config.enabled
          ? "Connected to Beds24 API V2."
          : "API credentials work. Beds24 synchronisation is still disabled (BEDS24_ENABLED=false).",
        propertyId: match?.id ?? config.propertyId,
        propertyName: match?.name,
      };
    } catch (err) {
      return {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : "Could not connect to Beds24 API V2.",
      };
    }
  }

  async getProperties(): Promise<ChannelProperty[]> {
    const data = await beds24Request<unknown>("/properties", {
      query: { id: getBeds24Config().propertyId || undefined },
    });
    return asArray<Record<string, unknown>>(data).map((p) => ({
      id: String(p.id ?? p.propertyId ?? ""),
      name: String(p.name ?? p.propertyName ?? "Property"),
      currency: p.currency ? String(p.currency) : undefined,
    }));
  }

  async getRooms(propertyId: string): Promise<ChannelRoom[]> {
    const data = await beds24Request<unknown>("/rooms", {
      query: { propertyId },
    });
    return asArray<Record<string, unknown>>(data).map((r) => ({
      id: String(r.id ?? r.roomId ?? ""),
      propertyId: String(r.propertyId ?? propertyId),
      name: String(r.name ?? r.roomName ?? "Room"),
      qty: r.qty != null ? Number(r.qty) : undefined,
    }));
  }

  async getAvailability(
    query: ChannelAvailabilityQuery,
  ): Promise<ChannelAvailabilityResult[]> {
    assertLiveSyncAllowed("getAvailability");
    const data = await beds24Request<unknown>("/inventory/rooms/calendar", {
      query: {
        propertyId: query.propertyId,
        roomId: query.roomId,
        startDate: query.checkIn,
        endDate: query.checkOut,
      },
    });
    return asArray<Record<string, unknown>>(data).map((row) => ({
      roomId: String(row.roomId ?? query.roomId ?? ""),
      propertyId: String(row.propertyId ?? query.propertyId),
      available: Number(row.available ?? row.inventory ?? 0),
      currency: row.currency ? String(row.currency) : undefined,
      pricePerNight:
        row.price1 != null
          ? Number(row.price1)
          : row.price != null
            ? Number(row.price)
            : undefined,
    }));
  }

  async updateRates(updates: ChannelRateUpdate[]): Promise<void> {
    assertLiveSyncAllowed("updateRates");
    if (!updates.length) return;
    await beds24Request("/inventory/rooms/calendar", {
      method: "POST",
      body: updates.map((u) => ({
        propertyId: Number(u.propertyId) || u.propertyId,
        roomId: Number(u.roomId) || u.roomId,
        from: u.from,
        to: u.to,
        price1: u.price,
        minStay: u.minStay,
        numAvail: u.available,
        override: u.closed === true ? "closed" : undefined,
      })),
    });
  }

  async updateInventory(updates: ChannelRateUpdate[]): Promise<void> {
    await this.updateRates(updates);
  }

  async createBooking(input: ChannelBookingInput): Promise<ChannelBooking> {
    assertLiveSyncAllowed("createBooking");
    // Beds24 API V2 bookings POST — apiReference used for idempotent retries.
    const data = await beds24Request<unknown>("/bookings", {
      method: "POST",
      body: [
        {
          propertyId: Number(input.propertyId) || input.propertyId,
          roomId: Number(input.roomId) || input.roomId,
          arrival: input.checkIn,
          departure: input.checkOut,
          numAdult: input.adults,
          numChild: input.children ?? 0,
          firstName: input.guest.firstName,
          lastName: input.guest.lastName,
          email: input.guest.email,
          mobile: input.guest.phone,
          apiReference: input.idempotencyKey,
          status: "confirmed",
          price: input.totalAmount,
          comment: [
            input.localReference ? `Highbury ref ${input.localReference}` : null,
            input.notes,
          ]
            .filter(Boolean)
            .join(" — "),
        },
      ],
    });
    const rows = asArray<Record<string, unknown>>(data);
    const first = rows[0];
    if (!first) {
      throw new ChannelManagerError(
        "Beds24 did not return a booking id.",
        502,
        "beds24_create",
      );
    }
    const mapped = mapBooking(first);
    if (!mapped.externalId) {
      throw new ChannelManagerError(
        "Beds24 booking response missing id.",
        502,
        "beds24_create",
      );
    }
    return mapped;
  }

  async getBooking(externalId: string): Promise<ChannelBooking | null> {
    assertLiveSyncAllowed("getBooking");
    const data = await beds24Request<unknown>("/bookings", {
      query: { id: externalId },
    });
    const rows = asArray<Record<string, unknown>>(data);
    return rows[0] ? mapBooking(rows[0]) : null;
  }

  async updateBooking(update: ChannelBookingUpdate): Promise<ChannelBooking> {
    assertLiveSyncAllowed("updateBooking");
    const data = await beds24Request<unknown>("/bookings", {
      method: "POST",
      body: [
        {
          id: Number(update.externalId) || update.externalId,
          arrival: update.checkIn,
          departure: update.checkOut,
          status: update.status,
          comment: update.notes,
        },
      ],
    });
    const rows = asArray<Record<string, unknown>>(data);
    if (!rows[0]) {
      throw new ChannelManagerError("Beds24 booking update returned empty.", 502);
    }
    return mapBooking(rows[0]);
  }

  async cancelBooking(
    externalId: string,
    reason?: string,
  ): Promise<ChannelBooking> {
    return this.updateBooking({
      externalId,
      status: "cancelled",
      notes: reason,
    });
  }

  async processWebhook(
    headers: Headers,
    body: string,
  ): Promise<ChannelWebhookResult> {
    const config = getBeds24Config();
    // Beds24 supports optional custom headers configured in the property Access
    // settings — we verify our shared secret when BEDS24_WEBHOOK_SECRET is set.
    if (config.webhookSecret) {
      const provided =
        headers.get("x-beds24-secret") ||
        headers.get("x-webhook-secret") ||
        headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
        "";
      if (provided !== config.webhookSecret) {
        throw new ChannelManagerError(
          "Invalid Beds24 webhook secret.",
          401,
          "beds24_webhook_auth",
        );
      }
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = body ? (JSON.parse(body) as Record<string, unknown>) : {};
    } catch {
      throw new ChannelManagerError("Invalid Beds24 webhook JSON.", 400);
    }

    const externalBookingId = String(
      payload.bookId ?? payload.bookingId ?? payload.id ?? "",
    );
    const action = String(
      payload.action ?? payload.status ?? payload.bookingStatus ?? "booking",
    ).toLowerCase();

    let eventType = "booking.updated";
    if (action.includes("cancel")) eventType = "booking.cancelled";
    else if (action.includes("new") || action.includes("create")) {
      eventType = "booking.created";
    } else if (action.includes("modif") || action.includes("date")) {
      eventType = "booking.modified";
    }

    if (!isBeds24Enabled()) {
      return {
        handled: false,
        eventType,
        externalBookingId: externalBookingId || undefined,
        message:
          "Webhook received but Beds24 synchronisation is disabled. No Highbury booking was created or updated.",
      };
    }

    // Live mode requires a configured shared secret — reject open webhooks.
    if (!config.webhookSecret) {
      throw new ChannelManagerError(
        "BEDS24_WEBHOOK_SECRET is required when Beds24 synchronisation is enabled.",
        503,
        "beds24_webhook_secret_missing",
      );
    }

    return {
      handled: true,
      eventType,
      externalBookingId: externalBookingId || undefined,
      message:
        "Webhook accepted. Apply inbound booking upsert via channel sync service.",
    };
  }
}

export function createBeds24Provider(): Beds24Provider {
  return new Beds24Provider();
}
