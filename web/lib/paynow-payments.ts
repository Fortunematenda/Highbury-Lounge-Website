import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookingGuests,
  bookings,
  conferenceEnquiries,
  eventTicketOrders,
  foodOrders,
  payments,
  paynowTransactions,
} from "@/db/schema";
import { getTicketOrderById, verifyTicketOrder } from "@/lib/event-tickets";
import {
  initiatePayment,
  isPaynowConfigured,
  paynowMerchantReference,
  PaynowError,
  pollPayment,
  requirePaynowConfig,
  type PaynowEntityType,
  verifyPaynowHash,
} from "@/lib/paynow";

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export type StartPaynowInput = {
  entityType: PaynowEntityType;
  entityId: number;
  amount: number;
  currency: string;
  description: string;
  authEmail?: string | null;
  /** Guest-facing success path after return handler */
  successPath: string;
};

export async function startPaynowCheckout(input: StartPaynowInput) {
  if (!isPaynowConfigured()) {
    throw new PaynowError(
      "Online payments are not configured yet. Please contact Highbury Lounge.",
      503,
    );
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new PaynowError("Nothing to pay for this order.");
  }

  const { siteUrl } = requirePaynowConfig();
  const db = getDb();
  const reference = paynowMerchantReference(input.entityType, input.entityId);
  const returnUrl = `${siteUrl}/api/payments/paynow/return?ref=${encodeURIComponent(reference)}`;
  const resultUrl = `${siteUrl}/api/payments/paynow/result`;

  const init = await initiatePayment({
    reference,
    amount: input.amount,
    additionalInfo: input.description,
    returnUrl,
    resultUrl,
    authEmail: input.authEmail,
  });

  if (!init.success || !init.browserUrl) {
    throw new PaynowError(
      init.error || "Could not start Paynow checkout. Please try again.",
      502,
    );
  }

  const [row] = await db
    .insert(paynowTransactions)
    .values({
      reference,
      entityType: input.entityType,
      entityId: input.entityId,
      amount: Math.round(input.amount * 100) / 100,
      currency: input.currency || "USD",
      status: "pending",
      paynowReference: init.paynowReference || null,
      pollUrl: init.pollUrl || null,
      browserUrl: init.browserUrl,
      rawInitJson: JSON.stringify(init.raw),
    })
    .returning();

  return {
    transaction: row,
    redirectUrl: init.browserUrl,
    successPath: input.successPath,
  };
}

async function markBookingPaid(bookingId: number, paynowRef: string | null, amount: number) {
  const db = getDb();
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return;
  if (booking.paymentStatus === "Paid") return;

  const existingPaynow = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.bookingId, bookingId),
        eq(payments.method, "Paynow"),
        eq(payments.transactionReference, paynowRef || `paynow-${bookingId}`),
      ),
    )
    .limit(1);
  if (!existingPaynow.length) {
    await db.insert(payments).values({
      bookingId,
      amount: amount > 0 ? amount : booking.totalAmount,
      currency: booking.currency,
      method: "Paynow",
      status: "Paid",
      transactionReference: paynowRef || `paynow-${bookingId}`,
      paymentDate: todayISODate(),
      adminNote: "Paid via Paynow online checkout",
    });
  }

  const paidRows = await db
    .select({ amount: payments.amount, status: payments.status })
    .from(payments)
    .where(eq(payments.bookingId, bookingId));
  const paidTotal = paidRows
    .filter((p) => p.status === "Paid")
    .reduce((s, p) => s + Number(p.amount), 0);

  let paymentStatus = "Unpaid";
  if (paidTotal >= booking.totalAmount - 0.01) paymentStatus = "Paid";
  else if (paidTotal > 0) paymentStatus = "Partially Paid";

  await db
    .update(bookings)
    .set({
      paymentStatus,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(bookings.id, bookingId));
}

async function markTicketPaid(orderId: number) {
  await verifyTicketOrder(orderId, 0, "Auto-verified after Paynow payment");
}

async function markFoodPaid(orderId: number) {
  const db = getDb();
  await db
    .update(foodOrders)
    .set({
      paymentStatus: "paid",
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(foodOrders.id, orderId));
}

async function markConferencePaid(enquiryId: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(conferenceEnquiries)
    .where(eq(conferenceEnquiries.id, enquiryId))
    .limit(1);
  if (!row) return;
  await db
    .update(conferenceEnquiries)
    .set({
      paymentStatus: "paid",
      status:
        row.status === "Quotation Sent" || row.status === "Awaiting Approval"
          ? "Confirmed"
          : row.status,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(conferenceEnquiries.id, enquiryId));
}

export async function fulfillPaynowTransaction(
  txnId: number,
  resultFields: Record<string, string>,
) {
  const db = getDb();
  const [txn] = await db
    .select()
    .from(paynowTransactions)
    .where(eq(paynowTransactions.id, txnId))
    .limit(1);
  if (!txn) throw new PaynowError("Payment transaction not found.", 404);
  if (txn.status === "paid") return txn;

  const status = (resultFields.status || "").toLowerCase();
  const paynowRef =
    resultFields.paynowreference ||
    resultFields.paynowReference ||
    txn.paynowReference;

  if (status !== "paid") {
    const next =
      status === "cancelled" || status === "canceled"
        ? "cancelled"
        : status === "failed"
          ? "failed"
          : "pending";
    const [updated] = await db
      .update(paynowTransactions)
      .set({
        status: next,
        paynowReference: paynowRef || txn.paynowReference,
        rawResultJson: JSON.stringify(resultFields),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(paynowTransactions.id, txn.id))
      .returning();
    return updated;
  }

  if (txn.entityType === "booking") {
    await markBookingPaid(txn.entityId, paynowRef || null, Number(txn.amount));
  } else if (txn.entityType === "ticket_order") {
    await markTicketPaid(txn.entityId);
  } else if (txn.entityType === "food_order") {
    await markFoodPaid(txn.entityId);
  } else if (txn.entityType === "conference") {
    await markConferencePaid(txn.entityId);
  }

  const [updated] = await db
    .update(paynowTransactions)
    .set({
      status: "paid",
      paynowReference: paynowRef || txn.paynowReference,
      rawResultJson: JSON.stringify(resultFields),
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(paynowTransactions.id, txn.id))
    .returning();

  return updated;
}

export async function handlePaynowResultPayload(fields: Record<string, string>) {
  const { integrationKey } = requirePaynowConfig();
  const ok = await verifyPaynowHash(fields, integrationKey);
  if (!ok) throw new PaynowError("Invalid Paynow result hash.", 400);

  const reference = fields.reference;
  if (!reference) throw new PaynowError("Missing payment reference.", 400);

  const db = getDb();
  const [txn] = await db
    .select()
    .from(paynowTransactions)
    .where(eq(paynowTransactions.reference, reference))
    .limit(1);
  if (!txn) throw new PaynowError("Unknown payment reference.", 404);

  return fulfillPaynowTransaction(txn.id, fields);
}

export async function refreshPaynowTransaction(reference: string) {
  const db = getDb();
  const [txn] = await db
    .select()
    .from(paynowTransactions)
    .where(eq(paynowTransactions.reference, reference))
    .limit(1);
  if (!txn) throw new PaynowError("Payment not found.", 404);
  if (txn.status === "paid") return txn;
  if (!txn.pollUrl) return txn;

  const poll = await pollPayment(txn.pollUrl);
  return fulfillPaynowTransaction(txn.id, poll.raw);
}

export function successPathForEntity(
  entityType: PaynowEntityType,
  entityRef: string,
  extra?: { total?: number; currency?: string },
) {
  if (entityType === "booking") {
    const q = new URLSearchParams({
      reference: entityRef,
      paid: "1",
    });
    if (extra?.total != null) q.set("total", String(extra.total));
    if (extra?.currency) q.set("currency", extra.currency);
    return `/book/success?${q.toString()}`;
  }
  if (entityType === "ticket_order") {
    return `/events/tickets/${encodeURIComponent(entityRef)}?paid=1`;
  }
  if (entityType === "food_order") {
    return `/food-orders/${encodeURIComponent(entityRef)}?paid=1`;
  }
  return `/conference/pay/${encodeURIComponent(entityRef)}?paid=1`;
}

export async function startPaynowForBooking(bookingId: number) {
  const db = getDb();
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) throw new PaynowError("Booking not found.", 404);
  if (booking.paymentStatus === "Paid") {
    throw new PaynowError("This booking is already paid.");
  }
  const [guest] = await db
    .select()
    .from(bookingGuests)
    .where(
      and(eq(bookingGuests.bookingId, bookingId), eq(bookingGuests.isPrimary, true)),
    )
    .limit(1);

  return startPaynowCheckout({
    entityType: "booking",
    entityId: booking.id,
    amount: Number(booking.totalAmount),
    currency: booking.currency,
    description: `Room booking ${booking.reference}`,
    // Omit guest email: Paynow test mode rejects authemail unless it is the merchant account email.
    authEmail: null,
    successPath: successPathForEntity("booking", booking.reference, {
      total: booking.totalAmount,
      currency: booking.currency,
    }),
  });
}

export async function startPaynowForTicketOrder(orderId: number) {
  const row = await getTicketOrderById(orderId);
  if (!row?.order) throw new PaynowError("Ticket order not found.", 404);
  const order = row.order;
  if (order.paymentStatus === "paid") {
    throw new PaynowError("This ticket order is already paid.");
  }
  if (order.paymentStatus === "cancelled") {
    throw new PaynowError("Cancelled orders cannot be paid.");
  }

  const checkout = await startPaynowCheckout({
    entityType: "ticket_order",
    entityId: order.id,
    amount: Number(order.totalAmount),
    currency: order.currency,
    description: `Event tickets ${order.reference}`,
    // Omit guest email: Paynow test mode rejects authemail unless it is the merchant account email.
    authEmail: null,
    successPath: successPathForEntity("ticket_order", order.reference),
  });

  const db = getDb();
  await db
    .update(eventTicketOrders)
    .set({
      paymentMethod: "paynow",
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(eventTicketOrders.id, order.id));

  return checkout;
}

export async function startPaynowForFoodOrder(orderId: number) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(foodOrders)
    .where(eq(foodOrders.id, orderId))
    .limit(1);
  if (!order) throw new PaynowError("Food order not found.", 404);
  if (order.bookingId) {
    throw new PaynowError(
      "This food order is linked to a room booking — pay with the booking total.",
    );
  }
  if (order.paymentStatus === "paid") {
    throw new PaynowError("This food order is already paid.");
  }

  return startPaynowCheckout({
    entityType: "food_order",
    entityId: order.id,
    amount: Number(order.totalAmount),
    currency: order.currency,
    description: `Food order ${order.reference}`,
    authEmail: order.guestEmail,
    successPath: successPathForEntity("food_order", order.reference),
  });
}

export async function startPaynowForConference(enquiryId: number) {
  const db = getDb();
  const [enquiry] = await db
    .select()
    .from(conferenceEnquiries)
    .where(eq(conferenceEnquiries.id, enquiryId))
    .limit(1);
  if (!enquiry) throw new PaynowError("Conference enquiry not found.", 404);
  const amount = Number(enquiry.quotationAmount || 0);
  if (!(amount > 0)) {
    throw new PaynowError("No quotation amount has been set for this enquiry.");
  }
  if (enquiry.paymentStatus === "paid") {
    throw new PaynowError("This quotation is already paid.");
  }

  await db
    .update(conferenceEnquiries)
    .set({
      paymentStatus: "pending",
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(conferenceEnquiries.id, enquiry.id));

  return startPaynowCheckout({
    entityType: "conference",
    entityId: enquiry.id,
    amount,
    currency: "USD",
    description: `Conference quotation ${enquiry.reference}`,
    authEmail: enquiry.email,
    successPath: successPathForEntity("conference", enquiry.reference),
  });
}
