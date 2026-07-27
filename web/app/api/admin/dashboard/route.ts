import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import {
  adminNotifications,
  bookingGuests,
  bookings,
  conferenceEnquiries,
  payments,
  roomTypes,
} from "@/db/schema";
import { todayISODate } from "@/lib/availability";
import { jsonError } from "@/lib/format";

function daysAgoISO(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function emptyTrend(days: number) {
  const points: Array<{ date: string; value: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    points.push({ date: daysAgoISO(i), value: 0 });
  }
  return points;
}

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    const range = Number(new URL(request.url).searchParams.get("range") ?? "30") || 30;
    const days = [7, 30, 90, 365].includes(range) ? range : 30;
    const since = daysAgoISO(days);
    const previousSince = daysAgoISO(days * 2);
    const db = getDb();
    const today = todayISODate();

    const [totals] = await db.select({ value: sql<number>`count(*)` }).from(bookings);
    const [pending] = await db
      .select({ value: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.status, "Pending"));
    const [confirmed] = await db
      .select({ value: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.status, "Confirmed"));
    const [occupied] = await db
      .select({ value: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.status, "Checked In"));
    const [conferenceCount] = await db
      .select({ value: sql<number>`count(*)` })
      .from(conferenceEnquiries);

    const revenueRows = await db
      .select({ total: bookings.totalAmount })
      .from(bookings)
      .where(
        inArray(bookings.status, ["Confirmed", "Checked In", "Checked Out"]),
      );
    const revenue = revenueRows.reduce((sum, r) => sum + (r.total || 0), 0);

    const inventory = await db.select({ qty: roomTypes.inventoryCount }).from(roomTypes);
    const totalRooms = inventory.reduce((s, r) => s + r.qty, 0);
    const occupiedCount = Number(occupied?.value ?? 0);
    const availableRooms = Math.max(0, totalRooms - occupiedCount);
    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 1000) / 10 : 0;

    const periodBookings = await db
      .select({
        createdAt: bookings.createdAt,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .where(gte(bookings.createdAt, since));

    const previousBookings = await db
      .select({
        createdAt: bookings.createdAt,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.createdAt, previousSince),
          sql`${bookings.createdAt} < ${since}`,
        ),
      );

    const bookingTrendMap = new Map(emptyTrend(Math.min(days, 90)).map((p) => [p.date, 0]));
    const revenueTrendMap = new Map(emptyTrend(Math.min(days, 90)).map((p) => [p.date, 0]));
    for (const row of periodBookings) {
      const day = String(row.createdAt).slice(0, 10);
      if (bookingTrendMap.has(day)) {
        bookingTrendMap.set(day, (bookingTrendMap.get(day) ?? 0) + 1);
      }
      if (
        revenueTrendMap.has(day) &&
        ["Confirmed", "Checked In", "Checked Out"].includes(row.status)
      ) {
        revenueTrendMap.set(
          day,
          (revenueTrendMap.get(day) ?? 0) + (row.totalAmount || 0),
        );
      }
    }

    const periodCount = periodBookings.length;
    const previousCount = previousBookings.length;
    const periodRevenue = periodBookings
      .filter((b) =>
        ["Confirmed", "Checked In", "Checked Out"].includes(b.status),
      )
      .reduce((s, b) => s + (b.totalAmount || 0), 0);
    const previousRevenue = previousBookings
      .filter((b) =>
        ["Confirmed", "Checked In", "Checked Out"].includes(b.status),
      )
      .reduce((s, b) => s + (b.totalAmount || 0), 0);

    function pctChange(current: number, previous: number) {
      if (previous <= 0 && current <= 0) {
        return { change: null as number | null, label: "Not enough comparison data" };
      }
      if (previous <= 0) {
        return { change: null as number | null, label: "Not enough comparison data" };
      }
      const change = Math.round(((current - previous) / previous) * 1000) / 10;
      return { change, label: `${change > 0 ? "+" : ""}${change}% vs prior period` };
    }

    const statusRows = await db
      .select({
        status: bookings.status,
        value: sql<number>`count(*)`,
      })
      .from(bookings)
      .groupBy(bookings.status);

    const paymentRevenue = await db
      .select({ amount: payments.amount, status: payments.status })
      .from(payments)
      .where(eq(payments.status, "Paid"));
    const paidAmount = paymentRevenue.reduce((s, p) => s + (p.amount || 0), 0);

    const recent = await db
      .select({
        id: bookings.id,
        reference: bookings.reference,
        status: bookings.status,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        totalAmount: bookings.totalAmount,
        currency: bookings.currency,
        roomName: roomTypes.name,
        firstName: bookingGuests.firstName,
        lastName: bookingGuests.lastName,
      })
      .from(bookings)
      .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
      .leftJoin(bookingGuests, eq(bookingGuests.bookingId, bookings.id))
      .orderBy(desc(bookings.createdAt))
      .limit(8);

    const recentNotifications = await db
      .select()
      .from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(8);

    const conferencePeriod = await db
      .select({ createdAt: conferenceEnquiries.createdAt })
      .from(conferenceEnquiries)
      .where(gte(conferenceEnquiries.createdAt, since));
    const conferenceTrendMap = new Map(
      emptyTrend(Math.min(days, 90)).map((p) => [p.date, 0]),
    );
    for (const row of conferencePeriod) {
      const day = String(row.createdAt).slice(0, 10);
      if (conferenceTrendMap.has(day)) {
        conferenceTrendMap.set(day, (conferenceTrendMap.get(day) ?? 0) + 1);
      }
    }

    const conferencePrevious = await db
      .select({ createdAt: conferenceEnquiries.createdAt })
      .from(conferenceEnquiries)
      .where(
        and(
          gte(conferenceEnquiries.createdAt, previousSince),
          sql`${conferenceEnquiries.createdAt} < ${since}`,
        ),
      );

    return Response.json({
      greetingName: user.fullName.split(" ")[0] || user.fullName,
      range: days,
      totals: {
        bookings: Number(totals?.value ?? 0),
        confirmedBookings: Number(confirmed?.value ?? 0),
        pendingBookings: Number(pending?.value ?? 0),
        availableRooms,
        occupancyRate,
        revenue,
        conferenceRequests: Number(conferenceCount?.value ?? 0),
        foodPreorders: 0,
        occupiedRooms: occupiedCount,
        totalRooms,
      },
      comparisons: {
        bookings: pctChange(periodCount, previousCount),
        revenue: pctChange(periodRevenue, previousRevenue),
        conference: pctChange(conferencePeriod.length, conferencePrevious.length),
        occupancy: {
          change: null as number | null,
          label: "Not enough comparison data",
        },
      },
      trends: {
        bookingTrend: [...bookingTrendMap.entries()].map(([date, value]) => ({
          date,
          value,
        })),
        revenueTrend: [...revenueTrendMap.entries()].map(([date, value]) => ({
          date,
          value,
        })),
        occupancyTrend: emptyTrend(Math.min(days, 30)).map((p) => ({
          date: p.date,
          value: occupancyRate,
        })),
        conferenceTrend: [...conferenceTrendMap.entries()].map(
          ([date, value]) => ({ date, value }),
        ),
        preorderTrend: emptyTrend(Math.min(days, 30)),
      },
      bookingStatusBreakdown: statusRows.map((r) => ({
        status: r.status,
        count: Number(r.value ?? 0),
      })),
      revenueSources: [
        { source: "Room bookings", amount: revenue },
        { source: "Recorded payments", amount: paidAmount },
        { source: "Conference bookings", amount: 0 },
        { source: "Food pre-orders", amount: 0 },
      ],
      recentBookings: recent,
      recentNotifications,
      today,
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load dashboard.", 500);
  }
}
