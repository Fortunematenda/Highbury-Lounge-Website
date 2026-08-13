import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import {
  bookingGuests,
  bookings,
  conferenceEnquiries,
  events,
  eventTicketOrders,
  foodOrders,
  payments,
  roomTypes,
  sitePageViews,
} from "@/db/schema";
import { detectDevice } from "@/lib/analytics";
import { jsonError } from "@/lib/format";
import { formatVenueDateTime } from "@/lib/timezone";

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvResponse(filename: string, lines: string[]) {
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "bookings";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const status = url.searchParams.get("status");

    const db = getDb();

    if (type === "bookings") {
      const conditions = [];
      // Stay overlap with optional range (not fully-contained-only)
      if (from) conditions.push(gte(bookings.checkOut, from));
      if (to) conditions.push(lte(bookings.checkIn, to));
      if (status) conditions.push(eq(bookings.status, status));

      const rows = await db
        .select({
          reference: bookings.reference,
          status: bookings.status,
          room: roomTypes.name,
          checkIn: bookings.checkIn,
          checkOut: bookings.checkOut,
          adults: bookings.adults,
          children: bookings.children,
          totalAmount: bookings.totalAmount,
          currency: bookings.currency,
          paymentStatus: bookings.paymentStatus,
          guestFirst: bookingGuests.firstName,
          guestLast: bookingGuests.lastName,
          guestEmail: bookingGuests.email,
          guestPhone: bookingGuests.phone,
          createdAt: bookings.createdAt,
        })
        .from(bookings)
        .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
        .leftJoin(
          bookingGuests,
          and(
            eq(bookingGuests.bookingId, bookings.id),
            eq(bookingGuests.isPrimary, true),
          ),
        )
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(sql`${bookings.createdAt} desc`);

      const header = [
        "reference",
        "status",
        "room",
        "check_in",
        "check_out",
        "adults",
        "children",
        "total",
        "currency",
        "payment_status",
        "guest_name",
        "guest_email",
        "guest_phone",
        "created_at",
      ];
      const lines = [header.join(",")];
      for (const r of rows) {
        lines.push(
          [
            r.reference,
            r.status,
            r.room,
            r.checkIn,
            r.checkOut,
            r.adults,
            r.children,
            r.totalAmount,
            r.currency,
            r.paymentStatus,
            `${r.guestFirst ?? ""} ${r.guestLast ?? ""}`.trim(),
            r.guestEmail,
            r.guestPhone,
            formatVenueDateTime(r.createdAt, { withSeconds: true }),
          ]
            .map(csvEscape)
            .join(","),
        );
      }
      return csvResponse("bookings-export.csv", lines);
    }

    if (type === "revenue") {
      const conditions = [];
      if (from) conditions.push(sql`substr(${bookings.createdAt}, 1, 10) >= ${from}`);
      if (to) conditions.push(sql`substr(${bookings.createdAt}, 1, 10) <= ${to}`);

      const rows = await db
        .select({
          status: bookings.status,
          total: sql<number>`coalesce(sum(${bookings.totalAmount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(bookings)
        .where(conditions.length ? and(...conditions) : undefined)
        .groupBy(bookings.status);

      const lines = [
        "status,count,total",
        ...rows.map((r) =>
          [r.status, r.count, r.total].map(csvEscape).join(","),
        ),
      ];
      return csvResponse("revenue-by-status.csv", lines);
    }

    if (type === "payments") {
      const conditions = [];
      if (from) conditions.push(sql`substr(${payments.createdAt}, 1, 10) >= ${from}`);
      if (to) conditions.push(sql`substr(${payments.createdAt}, 1, 10) <= ${to}`);

      const rows = await db
        .select({
          id: payments.id,
          bookingReference: bookings.reference,
          amount: payments.amount,
          currency: payments.currency,
          method: payments.method,
          status: payments.status,
          transactionReference: payments.transactionReference,
          paymentDate: payments.paymentDate,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .leftJoin(bookings, eq(payments.bookingId, bookings.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(payments.createdAt));

      const lines = [
        "id,booking_reference,amount,currency,method,status,transaction_reference,payment_date,created_at",
        ...rows.map((r) =>
          [
            r.id,
            r.bookingReference,
            r.amount,
            r.currency,
            r.method,
            r.status,
            r.transactionReference,
            r.paymentDate,
            formatVenueDateTime(r.createdAt, { withSeconds: true }),
          ]
            .map(csvEscape)
            .join(","),
        ),
      ];
      return csvResponse("payments-export.csv", lines);
    }

    if (type === "food-orders") {
      const conditions = [];
      if (from) conditions.push(sql`substr(${foodOrders.createdAt}, 1, 10) >= ${from}`);
      if (to) conditions.push(sql`substr(${foodOrders.createdAt}, 1, 10) <= ${to}`);

      const rows = await db
        .select({
          reference: foodOrders.reference,
          status: foodOrders.status,
          guestName: foodOrders.guestName,
          guestEmail: foodOrders.guestEmail,
          guestPhone: foodOrders.guestPhone,
          serviceDate: foodOrders.serviceDate,
          serviceType: foodOrders.serviceType,
          totalAmount: foodOrders.totalAmount,
          currency: foodOrders.currency,
          bookingReference: bookings.reference,
          createdAt: foodOrders.createdAt,
        })
        .from(foodOrders)
        .leftJoin(bookings, eq(foodOrders.bookingId, bookings.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(foodOrders.createdAt));

      const lines = [
        "reference,status,guest_name,guest_email,guest_phone,service_date,service_type,total,currency,booking_reference,created_at",
        ...rows.map((r) =>
          [
            r.reference,
            r.status,
            r.guestName,
            r.guestEmail,
            r.guestPhone,
            r.serviceDate,
            r.serviceType,
            r.totalAmount,
            r.currency,
            r.bookingReference,
            formatVenueDateTime(r.createdAt, { withSeconds: true }),
          ]
            .map(csvEscape)
            .join(","),
        ),
      ];
      return csvResponse("food-orders-export.csv", lines);
    }

    if (type === "conference") {
      const conditions = [];
      if (from) {
        conditions.push(
          sql`substr(${conferenceEnquiries.createdAt}, 1, 10) >= ${from}`,
        );
      }
      if (to) {
        conditions.push(
          sql`substr(${conferenceEnquiries.createdAt}, 1, 10) <= ${to}`,
        );
      }

      const rows = await db
        .select()
        .from(conferenceEnquiries)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(conferenceEnquiries.createdAt));

      const lines = [
        "reference,status,contact_name,company,email,phone,event_type,preferred_date,attendees,created_at",
        ...rows.map((r) =>
          [
            r.reference,
            r.status,
            r.contactName,
            r.company,
            r.email,
            r.phone,
            r.eventType,
            r.preferredDate,
            r.attendees,
            formatVenueDateTime(r.createdAt, { withSeconds: true }),
          ]
            .map(csvEscape)
            .join(","),
        ),
      ];
      return csvResponse("conference-export.csv", lines);
    }

    if (type === "tickets") {
      const conditions = [];
      if (from) {
        conditions.push(
          sql`substr(${eventTicketOrders.createdAt}, 1, 10) >= ${from}`,
        );
      }
      if (to) {
        conditions.push(
          sql`substr(${eventTicketOrders.createdAt}, 1, 10) <= ${to}`,
        );
      }

      const rows = await db
        .select({
          reference: eventTicketOrders.reference,
          fullName: eventTicketOrders.fullName,
          email: eventTicketOrders.email,
          phone: eventTicketOrders.phone,
          ticketTypeName: eventTicketOrders.ticketTypeName,
          quantity: eventTicketOrders.quantity,
          totalAmount: eventTicketOrders.totalAmount,
          currency: eventTicketOrders.currency,
          paymentStatus: eventTicketOrders.paymentStatus,
          eventTitle: events.title,
          createdAt: eventTicketOrders.createdAt,
        })
        .from(eventTicketOrders)
        .leftJoin(events, eq(eventTicketOrders.eventId, events.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(eventTicketOrders.createdAt));

      const lines = [
        "reference,guest_name,email,phone,event,ticket_type,quantity,total,currency,payment_status,created_at",
        ...rows.map((r) =>
          [
            r.reference,
            r.fullName,
            r.email,
            r.phone,
            r.eventTitle,
            r.ticketTypeName,
            r.quantity,
            r.totalAmount,
            r.currency,
            r.paymentStatus,
            formatVenueDateTime(r.createdAt, { withSeconds: true }),
          ]
            .map(csvEscape)
            .join(","),
        ),
      ];
      return csvResponse("event-tickets-export.csv", lines);
    }

    if (type === "visitors") {
      const conditions = [];
      if (from) {
        conditions.push(sql`substr(${sitePageViews.createdAt}, 1, 10) >= ${from}`);
      }
      if (to) {
        conditions.push(sql`substr(${sitePageViews.createdAt}, 1, 10) <= ${to}`);
      }

      const rows = await db
        .select({
          createdAt: sitePageViews.createdAt,
          path: sitePageViews.path,
          title: sitePageViews.title,
          country: sitePageViews.country,
          ip: sitePageViews.ip,
          device: sitePageViews.device,
          userAgent: sitePageViews.userAgent,
          referrer: sitePageViews.referrer,
          visitorId: sitePageViews.visitorId,
        })
        .from(sitePageViews)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(sitePageViews.createdAt))
        .limit(5000);

      const lines = [
        "when,path,title,country,ip,device,referrer,visitor_id",
        ...rows.map((r) =>
          [
            formatVenueDateTime(r.createdAt, { withSeconds: true }),
            r.path,
            r.title,
            r.country,
            r.ip,
            r.device || detectDevice(r.userAgent),
            r.referrer,
            r.visitorId,
          ]
            .map(csvEscape)
            .join(","),
        ),
      ];
      return csvResponse("website-visitors-export.csv", lines);
    }

    return jsonError("Unknown export type.", 400);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Export failed.", 500);
  }
}
