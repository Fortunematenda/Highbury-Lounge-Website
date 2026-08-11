import {
  lookupTicketOrders,
  resendTicketOrderLink,
  TicketError,
  ticketOrderPublicPath,
} from "@/lib/event-tickets";
import { jsonError } from "@/lib/format";

const recentLookups = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      reference?: string;
      phone?: string;
      resendEmail?: boolean;
    };

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    const key = `${ip}:${(body.email || "anon").toLowerCase()}`;
    const now = Date.now();
    const last = recentLookups.get(key) ?? 0;
    if (now - last < 10_000) {
      return jsonError("Please wait a moment before trying again.", 429);
    }
    recentLookups.set(key, now);

    const rows = await lookupTicketOrders({
      email: body.email || "",
      reference: body.reference,
      phone: body.phone,
    });

    if (rows.length === 0) {
      return Response.json({
        ok: true,
        found: false,
        message:
          "No matching ticket order was found. Check the email and reference/phone, or contact Highbury Lounge.",
        orders: [],
      });
    }

    if (body.resendEmail !== false) {
      for (const row of rows) {
        if (row.order.paymentStatus === "cancelled") continue;
        await resendTicketOrderLink(row.order.id).catch(() => undefined);
      }
    }

    return Response.json({
      ok: true,
      found: true,
      orders: rows.map((row) => ({
        reference: row.order.reference,
        paymentStatus: row.order.paymentStatus,
        ticketTypeName: row.order.ticketTypeName,
        quantity: row.order.quantity,
        eventTitle: row.eventTitle,
        eventStartAt: row.eventStartAt,
        ticketUrl: ticketOrderPublicPath(row.order.reference),
        ticketCode:
          row.order.paymentStatus === "paid" ? row.order.ticketCode : null,
      })),
    });
  } catch (error) {
    if (error instanceof TicketError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Unable to look up ticket orders.", 500);
  }
}
