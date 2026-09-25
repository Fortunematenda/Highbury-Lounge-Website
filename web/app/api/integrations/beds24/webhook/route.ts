import {
  getBeds24Config,
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
 * Optional custom header secret via BEDS24_WEBHOOK_SECRET.
 *
 * Idempotent: duplicate deliveries update the same Highbury booking.
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
    await upsertInboundChannelBooking({
      externalBookingId: result.externalBookingId,
      externalReference: String(
        payload.reference ?? payload.apiReference ?? result.externalBookingId,
      ),
      externalRoomId: String(payload.roomId ?? ""),
      externalPropertyId: String(
        payload.propertyId ?? payload.propId ?? config.propertyId,
      ),
      checkIn: String(payload.arrival ?? payload.firstNight ?? ""),
      checkOut: String(payload.departure ?? payload.lastNight ?? ""),
      adults: Number(payload.numAdult ?? payload.adults ?? 1),
      children: Number(payload.numChild ?? payload.children ?? 0),
      status: String(payload.status ?? payload.bookingStatus ?? ""),
      totalAmount:
        payload.price != null ? Number(payload.price) : undefined,
      currency: payload.currency ? String(payload.currency) : undefined,
      guest: {
        firstName: String(payload.firstName ?? ""),
        lastName: String(payload.lastName ?? ""),
        email: payload.email ? String(payload.email) : undefined,
        phone: payload.mobile || payload.phone
          ? String(payload.mobile ?? payload.phone)
          : undefined,
      },
      channelName: String(payload.referer ?? payload.channel ?? payload.apiSource ?? ""),
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
