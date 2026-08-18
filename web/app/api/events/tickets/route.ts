import {
  createTicketOrder,
  TicketError,
} from "@/lib/event-tickets";
import { jsonError } from "@/lib/format";
import { isPaynowConfigured } from "@/lib/paynow";
import { startPaynowForTicketOrder } from "@/lib/paynow-payments";

const recentSubmissions = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      eventId?: number;
      ticketTypeId?: number;
      fullName?: string;
      email?: string;
      phone?: string;
      quantity?: number;
    };

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    const key = `${ip}:${(body.email || body.phone || "anon").toLowerCase()}`;
    const now = Date.now();
    const last = recentSubmissions.get(key) ?? 0;
    if (now - last < 15_000) {
      return jsonError("Please wait a moment before submitting again.", 429);
    }
    recentSubmissions.set(key, now);

    const result = await createTicketOrder({
      eventId: Number(body.eventId),
      ticketTypeId: Number(body.ticketTypeId),
      fullName: body.fullName || "",
      email: body.email || "",
      phone: body.phone || "",
      quantity: Number(body.quantity || 1),
    });

    let paynowRedirectUrl: string | null = null;
    let paynowError: string | null = null;
    // Online Paynow checkout is opt-in via PAYNOW_ENABLED=true (kept ready for go-live).
    if (isPaynowConfigured() && Number(result.order.totalAmount) > 0) {
      try {
        const checkout = await startPaynowForTicketOrder(result.order.id);
        paynowRedirectUrl = checkout.redirectUrl;
      } catch (err) {
        console.error("Paynow ticket initiate failed:", err);
        paynowError =
          err instanceof Error
            ? err.message
            : "Could not start Paynow checkout.";
      }
    }

    return Response.json(
      {
        ok: true,
        order: {
          id: result.order.id,
          reference: result.order.reference,
          paymentStatus: result.order.paymentStatus,
          ticketTypeName: result.order.ticketTypeName,
          quantity: result.order.quantity,
          unitPrice: result.order.unitPrice,
          totalAmount: result.order.totalAmount,
          currency: result.order.currency,
        },
        event: {
          title: result.event.title,
          slug: result.event.slug,
          startAt: result.event.startAt,
          venueName: result.event.venueName,
        },
        bank: result.bank,
        ticketUrl: `/events/tickets/${result.order.reference}`,
        paynowRedirectUrl,
        paynowError,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof TicketError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Unable to create ticket order.", 500);
  }
}
