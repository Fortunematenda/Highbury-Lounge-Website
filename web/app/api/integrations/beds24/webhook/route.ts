import {
  getBeds24Config,
  getChannelManager,
  isBeds24Enabled,
  upsertInboundChannelBooking,
  writeChannelSyncLog,
  BEDS24_PROVIDER,
} from "@/lib/channel-manager";
import { createBeds24Provider } from "@/lib/channel-manager/providers/beds24/provider";
import { ChannelManagerError } from "@/lib/channel-manager/types";
import { jsonError } from "@/lib/format";

/**
 * Beds24 booking webhook (API V2 / property Access → Booking Webhook).
 * Configure URL: {SITE_URL}/api/integrations/beds24/webhook
 * BEDS24_WEBHOOK_SECRET is required when BEDS24_ENABLED=true.
 *
 * Idempotent: duplicate deliveries update the same Highbury booking.
 * Thin payloads are enriched via Beds24 getBooking when possible.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  try {
    const provider = createBeds24Provider();
    const result = await provider.processWebhook(request.headers, raw);

    await writeChannelSyncLog({
      provider: BEDS24_PROVIDER,
      entityType: "webhook",
      externalReference: result.externalBookingId,
      direction: "INBOUND",
      eventType: result.eventType,
      status: result.handled ? "SUCCESS" : "PENDING",
      message: result.message,
    });

    if (!isBeds24Enabled()) {
      return Response.json({
        ok: true,
        handled: false,
        message: "Beds24 synchronisation is disabled.",
      });
    }

    if (!result.externalBookingId) {
      return Response.json({
        ok: true,
        handled: false,
        message: "No booking id in webhook payload.",
      });
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      payload = {};
    }

    const config = getBeds24Config();
    let externalRoomId = String(payload.roomId ?? "");
    let externalPropertyId = String(
      payload.propertyId ?? payload.propId ?? config.propertyId,
    );
    let checkIn = String(payload.arrival ?? payload.firstNight ?? "");
    let checkOut = String(payload.departure ?? payload.lastNight ?? "");
    let adults = Number(payload.numAdult ?? payload.adults ?? 1);
    let children = Number(payload.numChild ?? payload.children ?? 0);
    let status = String(payload.status ?? payload.bookingStatus ?? "");
    let totalAmount =
      payload.price != null ? Number(payload.price) : undefined;
    let currency = payload.currency ? String(payload.currency) : undefined;
    let guest = {
      firstName: String(payload.firstName ?? ""),
      lastName: String(payload.lastName ?? ""),
      email: payload.email ? String(payload.email) : undefined,
      phone:
        payload.mobile || payload.phone
          ? String(payload.mobile ?? payload.phone)
          : undefined,
    };
    let channelName = String(
      payload.referer ?? payload.channel ?? payload.apiSource ?? "",
    );
    let externalReference = String(
      payload.reference ?? payload.apiReference ?? result.externalBookingId,
    );

    const thin =
      !externalRoomId ||
      !checkIn ||
      !checkOut ||
      (!guest.firstName && !guest.email);

    if (thin) {
      try {
        const live = await getChannelManager().getBooking(
          result.externalBookingId,
        );
        if (live) {
          externalRoomId = externalRoomId || live.roomId;
          externalPropertyId = externalPropertyId || live.propertyId;
          checkIn = checkIn || live.checkIn;
          checkOut = checkOut || live.checkOut;
          adults = adults || live.adults || 1;
          children = children || live.children || 0;
          status = status || live.status;
          if (totalAmount == null && live.totalAmount != null) {
            totalAmount = live.totalAmount;
          }
          currency = currency || live.currency;
          guest = {
            firstName: guest.firstName || live.guest?.firstName || "",
            lastName: guest.lastName || live.guest?.lastName || "",
            email: guest.email || live.guest?.email,
            phone: guest.phone || live.guest?.phone,
          };
          externalReference =
            externalReference ||
            live.externalReference ||
            result.externalBookingId;
          await writeChannelSyncLog({
            provider: BEDS24_PROVIDER,
            entityType: "webhook",
            externalReference: result.externalBookingId,
            direction: "INBOUND",
            eventType: "webhook.enrich",
            status: "SUCCESS",
            message: "Enriched thin webhook payload via Beds24 getBooking.",
          });
        }
      } catch (err) {
        await writeChannelSyncLog({
          provider: BEDS24_PROVIDER,
          entityType: "webhook",
          externalReference: result.externalBookingId,
          direction: "INBOUND",
          eventType: "webhook.enrich",
          status: "FAILED",
          error: err instanceof Error ? err.message : "enrich failed",
        });
      }
    }

    await upsertInboundChannelBooking({
      externalBookingId: result.externalBookingId,
      externalReference,
      externalRoomId,
      externalPropertyId,
      checkIn,
      checkOut,
      adults,
      children,
      status,
      totalAmount,
      currency,
      guest,
      channelName,
    });

    return Response.json({ ok: true, handled: true });
  } catch (error) {
    if (error instanceof ChannelManagerError) {
      await writeChannelSyncLog({
        provider: BEDS24_PROVIDER,
        entityType: "webhook",
        direction: "INBOUND",
        eventType: "webhook.error",
        status: "FAILED",
        error: error.message,
      }).catch(() => undefined);
      return jsonError(error.message, error.status);
    }
    console.error("Beds24 webhook error:", error);
    return jsonError("Webhook processing failed.", 500);
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    provider: "beds24",
    enabled: isBeds24Enabled(),
    message:
      "Beds24 webhook endpoint. Configure this URL in Beds24 → Properties → Access → Booking Webhook.",
  });
}
