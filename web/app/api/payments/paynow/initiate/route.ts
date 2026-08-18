import { jsonError } from "@/lib/format";
import {
  startPaynowForBooking,
  startPaynowForConference,
  startPaynowForFoodOrder,
  startPaynowForTicketOrder,
} from "@/lib/paynow-payments";
import { PaynowError } from "@/lib/paynow";
import { getDb } from "@/db";
import {
  bookingGuests,
  bookings,
  conferenceEnquiries,
  eventTicketOrders,
  foodOrders,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      entityType?: string;
      reference?: string;
      email?: string;
      phone?: string;
    };

    const entityType = body.entityType?.trim();
    const reference = body.reference?.trim();
    if (!entityType || !reference) {
      return jsonError("entityType and reference are required.", 400);
    }

    const db = getDb();
    let redirectUrl = "";

    if (entityType === "booking") {
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.reference, reference.toUpperCase()))
        .limit(1);
      if (!booking) return jsonError("Booking not found.", 404);
      if (body.email) {
        const [guest] = await db
          .select()
          .from(bookingGuests)
          .where(
            and(
              eq(bookingGuests.bookingId, booking.id),
              eq(bookingGuests.isPrimary, true),
            ),
          )
          .limit(1);
        if (
          guest &&
          guest.email.toLowerCase() !== body.email.trim().toLowerCase()
        ) {
          return jsonError("Email does not match this booking.", 403);
        }
      }
      const checkout = await startPaynowForBooking(booking.id);
      redirectUrl = checkout.redirectUrl;
    } else if (entityType === "ticket_order") {
      const [order] = await db
        .select()
        .from(eventTicketOrders)
        .where(eq(eventTicketOrders.reference, reference.toUpperCase()))
        .limit(1);
      if (!order) return jsonError("Ticket order not found.", 404);
      if (
        body.email &&
        order.email.toLowerCase() !== body.email.trim().toLowerCase()
      ) {
        return jsonError("Email does not match this order.", 403);
      }
      const checkout = await startPaynowForTicketOrder(order.id);
      redirectUrl = checkout.redirectUrl;
    } else if (entityType === "food_order") {
      const [order] = await db
        .select()
        .from(foodOrders)
        .where(eq(foodOrders.reference, reference.toUpperCase()))
        .limit(1);
      if (!order) return jsonError("Food order not found.", 404);
      const checkout = await startPaynowForFoodOrder(order.id);
      redirectUrl = checkout.redirectUrl;
    } else if (entityType === "conference") {
      const [enquiry] = await db
        .select()
        .from(conferenceEnquiries)
        .where(eq(conferenceEnquiries.reference, reference.toUpperCase()))
        .limit(1);
      if (!enquiry) return jsonError("Conference enquiry not found.", 404);
      if (
        body.email &&
        enquiry.email.toLowerCase() !== body.email.trim().toLowerCase()
      ) {
        return jsonError("Email does not match this enquiry.", 403);
      }
      const checkout = await startPaynowForConference(enquiry.id);
      redirectUrl = checkout.redirectUrl;
    } else {
      return jsonError("Unsupported entityType.", 400);
    }

    return Response.json({ ok: true, redirectUrl });
  } catch (error) {
    if (error instanceof PaynowError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Unable to start payment.", 500);
  }
}
