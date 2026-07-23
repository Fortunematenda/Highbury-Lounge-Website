import { and, eq, gte, lte, sql } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { bookingGuests, bookings, roomTypes } from "@/db/schema";
import { jsonError } from "@/lib/format";

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
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
      if (from) conditions.push(gte(bookings.checkIn, from));
      if (to) conditions.push(lte(bookings.checkOut, to));
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
        .innerJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
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
            r.createdAt,
          ]
            .map(csvEscape)
            .join(","),
        );
      }

      return new Response(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="bookings-export.csv"`,
        },
      });
    }

    if (type === "revenue") {
      const rows = await db
        .select({
          status: bookings.status,
          total: sql<number>`coalesce(sum(${bookings.totalAmount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(bookings)
        .groupBy(bookings.status);

      const lines = ["status,count,total", ...rows.map((r) =>
        [r.status, r.count, r.total].map(csvEscape).join(","),
      )];
      return new Response(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="revenue-by-status.csv"`,
        },
      });
    }

    return jsonError("Unknown export type.", 400);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Export failed.", 500);
  }
}
