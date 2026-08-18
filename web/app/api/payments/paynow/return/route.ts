import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookings,
  conferenceEnquiries,
  eventTicketOrders,
  foodOrders,
  paynowTransactions,
} from "@/db/schema";
import { refreshPaynowTransaction, successPathForEntity } from "@/lib/paynow-payments";
import { PaynowError } from "@/lib/paynow";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const reference = url.searchParams.get("ref")?.trim();
    if (!reference) {
      return Response.redirect(new URL("/", url.origin), 302);
    }

    let txn;
    try {
      txn = await refreshPaynowTransaction(reference);
    } catch {
      const db = getDb();
      const [row] = await db
        .select()
        .from(paynowTransactions)
        .where(eq(paynowTransactions.reference, reference))
        .limit(1);
      txn = row;
    }

    if (!txn) {
      return Response.redirect(new URL("/?payment=missing", url.origin), 302);
    }

    const db = getDb();
    let path = "/";

    if (txn.entityType === "booking") {
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, txn.entityId))
        .limit(1);
      if (booking) {
        path = successPathForEntity("booking", booking.reference, {
          total: booking.totalAmount,
          currency: booking.currency,
        });
        if (txn.status !== "paid") {
          path = `/book/success?reference=${encodeURIComponent(booking.reference)}&total=${booking.totalAmount}&currency=${booking.currency}&pending=1`;
        }
      }
    } else if (txn.entityType === "ticket_order") {
      const [order] = await db
        .select()
        .from(eventTicketOrders)
        .where(eq(eventTicketOrders.id, txn.entityId))
        .limit(1);
      if (order) {
        path =
          txn.status === "paid"
            ? successPathForEntity("ticket_order", order.reference)
            : `/events/tickets/${encodeURIComponent(order.reference)}?pending=1`;
      }
    } else if (txn.entityType === "food_order") {
      const [order] = await db
        .select()
        .from(foodOrders)
        .where(eq(foodOrders.id, txn.entityId))
        .limit(1);
      if (order) {
        path =
          txn.status === "paid"
            ? successPathForEntity("food_order", order.reference)
            : `/food-orders/${encodeURIComponent(order.reference)}?pending=1`;
      }
    } else if (txn.entityType === "conference") {
      const [enquiry] = await db
        .select()
        .from(conferenceEnquiries)
        .where(eq(conferenceEnquiries.id, txn.entityId))
        .limit(1);
      if (enquiry) {
        path =
          txn.status === "paid"
            ? successPathForEntity("conference", enquiry.reference)
            : `/conference/pay/${encodeURIComponent(enquiry.reference)}?pending=1`;
      }
    }

    return Response.redirect(new URL(path, url.origin), 302);
  } catch (error) {
    console.error("Paynow return error:", error);
    if (error instanceof PaynowError) {
      return new Response(error.message, { status: error.status });
    }
    return Response.redirect(new URL("/?payment=error", request.url), 302);
  }
}
