import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import {
  adminNotifications,
  bookingGuests,
  bookings,
  conferenceEnquiries,
  eventReservations,
  events,
  eventTicketOrders,
  foodOrders,
  payments,
  roomBlocks,
  roomTypes,
} from "@/db/schema";
import {
  ACTIVE_BOOKING_STATUSES,
  dateOverlapSql,
  todayISODate,
} from "@/lib/availability";
import { jsonError } from "@/lib/format";
import { formatEventDateTime } from "@/app/events/lib";
import { toVenueWallClock } from "@/lib/timezone";

type RangeKey = "today" | "7" | "30" | "month" | "year";

function venueDay(iso: string | null | undefined) {
  return toVenueWallClock(iso).slice(0, 10);
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysAgoISO(days: number, from = todayISODate()) {
  return addDaysISO(from, -days);
}

function emptyTrend(start: string, end: string) {
  const points: Array<{ date: string; value: number }> = [];
  let cursor = start;
  while (cursor <= end) {
    points.push({ date: cursor, value: 0 });
    cursor = addDaysISO(cursor, 1);
    if (points.length > 400) break;
  }
  return points;
}

function resolveRange(
  raw: string | null,
  fromParam?: string | null,
  toParam?: string | null,
): {
  key: string;
  since: string;
  until: string;
  label: string;
  trendDays: number;
} {
  const today = todayISODate();
  const from =
    fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? fromParam : null;
  const to =
    toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam) ? toParam : null;

  if (from || to) {
    const since = from || daysAgoISO(29);
    const until = to || today;
    const start = new Date(`${since}T12:00:00Z`);
    const end = new Date(`${until}T12:00:00Z`);
    const trendDays = Math.max(
      1,
      Math.min(
        366,
        Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
      ),
    );
    return {
      key: "custom",
      since,
      until,
      label: `${since} → ${until}`,
      trendDays,
    };
  }

  const key = (raw ?? "30") as RangeKey | string;
  if (key === "today" || key === "1") {
    return {
      key: "today",
      since: today,
      until: today,
      label: "Today",
      trendDays: 1,
    };
  }
  if (key === "7") {
    return {
      key: "7",
      since: daysAgoISO(6),
      until: today,
      label: "7 Days",
      trendDays: 7,
    };
  }
  if (key === "month") {
    const since = `${today.slice(0, 8)}01`;
    const day = Number(today.slice(8, 10));
    return {
      key: "month",
      since,
      until: today,
      label: "This Month",
      trendDays: Math.max(1, day),
    };
  }
  if (key === "year") {
    const since = `${today.slice(0, 4)}-01-01`;
    const start = new Date(`${since}T12:00:00Z`);
    const end = new Date(`${today}T12:00:00Z`);
    const trendDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
    );
    return {
      key: "year",
      since,
      until: today,
      label: "This Year",
      trendDays: Math.min(trendDays, 366),
    };
  }
  return {
    key: "30",
    since: daysAgoISO(29),
    until: today,
    label: "30 Days",
    trendDays: 30,
  };
}

/** Calendar-date compare that works for both SQLite and ISO timestamps. */
function createdOnOrAfter(column: unknown, ymd: string) {
  return sql`substr(${column}, 1, 10) >= ${ymd}`;
}

function createdBefore(column: unknown, ymd: string) {
  return sql`substr(${column}, 1, 10) < ${ymd}`;
}

function createdOnOrBefore(column: unknown, ymd: string) {
  return sql`substr(${column}, 1, 10) <= ${ymd}`;
}

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    const url = new URL(request.url);
    const rangeInfo = resolveRange(
      url.searchParams.get("range"),
      url.searchParams.get("from"),
      url.searchParams.get("to"),
    );
    const {
      since,
      until,
      key: rangeKey,
      label: rangeLabel,
      trendDays,
    } = rangeInfo;
    const previousSpanDays = Math.max(
      1,
      Math.round(
        (new Date(`${until}T12:00:00Z`).getTime() -
          new Date(`${since}T12:00:00Z`).getTime()) /
          86400000,
      ) + 1,
    );
    const previousSince = addDaysISO(since, -previousSpanDays);
    const db = getDb();
    const today = todayISODate();
    const tomorrow = addDaysISO(today, 1);

    const [totals] = await db.select({ value: sql<number>`count(*)` }).from(bookings);
    const [pending] = await db
      .select({ value: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.status, "Pending"));
    const [confirmed] = await db
      .select({ value: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.status, "Confirmed"));
    const [cancelled] = await db
      .select({ value: sql<number>`count(*)` })
      .from(bookings)
      .where(inArray(bookings.status, ["Cancelled", "Declined"]));

    const revenueRows = await db
      .select({ total: bookings.totalAmount })
      .from(bookings)
      .where(
        inArray(bookings.status, ["Confirmed", "Checked In", "Checked Out"]),
      );
    const revenue = revenueRows.reduce((sum, r) => sum + (r.total || 0), 0);

    const activeRooms = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.isActive, true))
      .orderBy(asc(roomTypes.displayOrder), asc(roomTypes.name));

    const totalActiveRooms = activeRooms.reduce(
      (sum, room) => sum + room.inventoryCount,
      0,
    );

    let occupiedUnits = 0;
    let maintenanceUnits = 0;
    let availableRooms = 0;
    const availableRoomList: Array<{
      id: number;
      roomNumber: string;
      name: string;
      roomType: string;
      capacity: number;
      price: number;
      status: "Available" | "Limited" | "Full" | "Maintenance";
      roomsRemaining: number;
      inventoryCount: number;
      nextBooking: string | null;
    }> = [];

    for (const room of activeRooms) {
      const bookingRows = await db
        .select({ rooms: bookings.roomsBooked })
        .from(bookings)
        .where(
          and(
            eq(bookings.roomTypeId, room.id),
            inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
            dateOverlapSql(bookings.checkIn, bookings.checkOut, today, tomorrow),
          ),
        );
      const booked = bookingRows.reduce((sum, r) => sum + r.rooms, 0);

      const blockRows = await db
        .select({ rooms: roomBlocks.roomsBlocked })
        .from(roomBlocks)
        .where(
          and(
            eq(roomBlocks.roomTypeId, room.id),
            dateOverlapSql(
              roomBlocks.startDate,
              roomBlocks.endDate,
              today,
              tomorrow,
            ),
          ),
        );
      const blocked = blockRows.reduce((s, r) => s + r.rooms, 0);

      const remaining = Math.max(0, room.inventoryCount - booked - blocked);

      occupiedUnits += Math.min(room.inventoryCount, booked);
      maintenanceUnits += Math.min(room.inventoryCount, blocked);
      availableRooms += remaining;

      const [next] = await db
        .select({
          checkIn: bookings.checkIn,
          reference: bookings.reference,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.roomTypeId, room.id),
            inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
            gte(bookings.checkIn, today),
          ),
        )
        .orderBy(asc(bookings.checkIn))
        .limit(1);

      let status: "Available" | "Limited" | "Full" | "Maintenance" = "Available";
      if (remaining <= 0 && blocked > 0) status = "Maintenance";
      else if (remaining <= 0) status = "Full";
      else if (remaining < room.inventoryCount) status = "Limited";

      availableRoomList.push({
        id: room.id,
        roomNumber: room.slug || `R-${room.id}`,
        name: room.name,
        roomType: room.bedType || room.name,
        capacity: room.maxGuests,
        price:
          room.promotionalPrice != null && room.promotionalPrice > 0
            ? room.promotionalPrice
            : room.pricePerNight,
        status,
        roomsRemaining: remaining,
        inventoryCount: room.inventoryCount,
        nextBooking: next
          ? `${next.checkIn} · ${next.reference}`
          : null,
      });
    }

    const occupancyRate =
      totalActiveRooms > 0
        ? Math.round((occupiedUnits / totalActiveRooms) * 1000) / 10
        : 0;

    const periodBookings = await db
      .select({
        createdAt: bookings.createdAt,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .where(
        and(
          createdOnOrAfter(bookings.createdAt, since),
          createdOnOrBefore(bookings.createdAt, until),
        ),
      );

    const previousBookings = await db
      .select({
        createdAt: bookings.createdAt,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .where(
        and(
          createdOnOrAfter(bookings.createdAt, previousSince),
          createdBefore(bookings.createdAt, since),
        ),
      );

    const trendStart = since;
    const trendEnd = until < today ? until : today;
    const bookingTrendMap = new Map(
      emptyTrend(trendStart, trendEnd).map((p) => [p.date, 0]),
    );
    const revenueTrendMap = new Map(
      emptyTrend(trendStart, trendEnd).map((p) => [p.date, 0]),
    );
    for (const row of periodBookings) {
      const day = venueDay(row.createdAt);
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
        return { change: 0, label: "0% vs prior period" };
      }
      if (previous <= 0) {
        return { change: 100, label: "New vs prior period" };
      }
      const change = Math.round(((current - previous) / previous) * 1000) / 10;
      return {
        change,
        label: `${change > 0 ? "+" : ""}${change}% vs prior period`,
      };
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

    let foodPreorders = 0;
    let pendingFoodOrders = 0;
    let preparingFoodOrders = 0;
    let readyFoodOrders = 0;
    let recentFoodOrders: Array<{
      id: number;
      reference: string;
      status: string;
      guestName: string | null;
      totalAmount: number;
      currency: string;
      createdAt: string;
    }> = [];
    const preorderTrendMap = new Map(
      emptyTrend(trendStart, trendEnd).map((p) => [p.date, 0]),
    );

    try {
      const [foodPreordersRow] = await db
        .select({ value: sql<number>`count(*)` })
        .from(foodOrders);
      foodPreorders = Number(foodPreordersRow?.value ?? 0);

      const [pendingFood] = await db
        .select({ value: sql<number>`count(*)` })
        .from(foodOrders)
        .where(eq(foodOrders.status, "Pending"));
      pendingFoodOrders = Number(pendingFood?.value ?? 0);

      const [preparingFood] = await db
        .select({ value: sql<number>`count(*)` })
        .from(foodOrders)
        .where(eq(foodOrders.status, "Preparing"));
      preparingFoodOrders = Number(preparingFood?.value ?? 0);

      const [readyFood] = await db
        .select({ value: sql<number>`count(*)` })
        .from(foodOrders)
        .where(eq(foodOrders.status, "Ready"));
      readyFoodOrders = Number(readyFood?.value ?? 0);

      const foodPeriod = await db
        .select({ createdAt: foodOrders.createdAt })
        .from(foodOrders)
        .where(
          and(
            createdOnOrAfter(foodOrders.createdAt, since),
            createdOnOrBefore(foodOrders.createdAt, until),
          ),
        );
      for (const row of foodPeriod) {
        const day = venueDay(row.createdAt);
        if (preorderTrendMap.has(day)) {
          preorderTrendMap.set(day, (preorderTrendMap.get(day) ?? 0) + 1);
        }
      }

      recentFoodOrders = await db
        .select({
          id: foodOrders.id,
          reference: foodOrders.reference,
          status: foodOrders.status,
          guestName: foodOrders.guestName,
          totalAmount: foodOrders.totalAmount,
          currency: foodOrders.currency,
          createdAt: foodOrders.createdAt,
        })
        .from(foodOrders)
        .orderBy(desc(foodOrders.createdAt))
        .limit(6);
    } catch (err) {
      console.error("Dashboard food order metrics skipped", err);
    }

    const [todayBookingsRow] = await db
      .select({ value: sql<number>`count(*)` })
      .from(bookings)
      .where(sql`substr(${bookings.createdAt}, 1, 10) = ${today}`);

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

    const [conferenceCount] = await db
      .select({ value: sql<number>`count(*)` })
      .from(conferenceEnquiries);

    const conferencePeriod = await db
      .select({ createdAt: conferenceEnquiries.createdAt })
      .from(conferenceEnquiries)
      .where(
        and(
          createdOnOrAfter(conferenceEnquiries.createdAt, since),
          createdOnOrBefore(conferenceEnquiries.createdAt, until),
        ),
      );
    const conferenceTrendMap = new Map(
      emptyTrend(trendStart, trendEnd).map((p) => [p.date, 0]),
    );
    for (const row of conferencePeriod) {
      const day = venueDay(row.createdAt);
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

    const occupancyTrend = emptyTrend(trendStart, trendEnd).map((p) => ({
      date: p.date,
      value: occupancyRate,
    }));

    let upcomingEventsCount = 0;
    let publishedEventsCount = 0;
    let pendingTicketOrders = 0;
    let paidTicketOrders = 0;
    let ticketsSold = 0;
    let ticketRevenue = 0;
    let pendingEventReservations = 0;
    let eventReservationsCount = 0;
    let upcomingEvents: Array<{
      id: number;
      title: string;
      slug: string;
      status: string;
      startAt: string;
      startLabel: string;
      category: string;
    }> = [];
    let recentTicketOrders: Array<{
      id: number;
      reference: string;
      fullName: string;
      paymentStatus: string;
      quantity: number;
      totalAmount: number;
      currency: string;
      eventTitle: string | null;
      createdAt: string;
    }> = [];
    let recentEventReservations: Array<{
      id: number;
      reference: string;
      fullName: string;
      status: string;
      guestCount: number;
      eventTitle: string | null;
      createdAt: string;
    }> = [];
    const ticketTrendMap = new Map(
      emptyTrend(trendStart, trendEnd).map((p) => [p.date, 0]),
    );

    try {
      const publishedEvents = await db
        .select({
          id: events.id,
          title: events.title,
          slug: events.slug,
          status: events.status,
          startAt: events.startAt,
          category: events.category,
        })
        .from(events)
        .where(and(eq(events.status, "published"), isNull(events.deletedAt)))
        .orderBy(asc(events.startAt));

      publishedEventsCount = publishedEvents.length;
      const upcoming = publishedEvents.filter(
        (event) => toVenueWallClock(event.startAt).slice(0, 10) >= today,
      );
      upcomingEventsCount = upcoming.length;
      upcomingEvents = upcoming.slice(0, 6).map((event) => ({
        id: event.id,
        title: event.title,
        slug: event.slug,
        status: event.status,
        startAt: event.startAt,
        startLabel: formatEventDateTime(event.startAt),
        category: event.category,
      }));

      const [pendingTicketsRow] = await db
        .select({ value: sql<number>`count(*)` })
        .from(eventTicketOrders)
        .where(eq(eventTicketOrders.paymentStatus, "pending"));
      pendingTicketOrders = Number(pendingTicketsRow?.value ?? 0);

      const paidTickets = await db
        .select({
          quantity: eventTicketOrders.quantity,
          totalAmount: eventTicketOrders.totalAmount,
        })
        .from(eventTicketOrders)
        .where(eq(eventTicketOrders.paymentStatus, "paid"));
      paidTicketOrders = paidTickets.length;
      ticketsSold = paidTickets.reduce((sum, row) => sum + (row.quantity || 0), 0);
      ticketRevenue = paidTickets.reduce(
        (sum, row) => sum + (row.totalAmount || 0),
        0,
      );

      const [pendingReservationsRow] = await db
        .select({ value: sql<number>`count(*)` })
        .from(eventReservations)
        .where(eq(eventReservations.status, "Pending"));
      pendingEventReservations = Number(pendingReservationsRow?.value ?? 0);

      const [reservationsTotalRow] = await db
        .select({ value: sql<number>`count(*)` })
        .from(eventReservations);
      eventReservationsCount = Number(reservationsTotalRow?.value ?? 0);

      const ticketPeriod = await db
        .select({ createdAt: eventTicketOrders.createdAt })
        .from(eventTicketOrders)
        .where(
          and(
            createdOnOrAfter(eventTicketOrders.createdAt, since),
            createdOnOrBefore(eventTicketOrders.createdAt, until),
          ),
        );
      for (const row of ticketPeriod) {
        const day = venueDay(row.createdAt);
        if (ticketTrendMap.has(day)) {
          ticketTrendMap.set(day, (ticketTrendMap.get(day) ?? 0) + 1);
        }
      }

      recentTicketOrders = await db
        .select({
          id: eventTicketOrders.id,
          reference: eventTicketOrders.reference,
          fullName: eventTicketOrders.fullName,
          paymentStatus: eventTicketOrders.paymentStatus,
          quantity: eventTicketOrders.quantity,
          totalAmount: eventTicketOrders.totalAmount,
          currency: eventTicketOrders.currency,
          eventTitle: events.title,
          createdAt: eventTicketOrders.createdAt,
        })
        .from(eventTicketOrders)
        .leftJoin(events, eq(events.id, eventTicketOrders.eventId))
        .orderBy(desc(eventTicketOrders.createdAt))
        .limit(6);

      recentEventReservations = await db
        .select({
          id: eventReservations.id,
          reference: eventReservations.reference,
          fullName: eventReservations.fullName,
          status: eventReservations.status,
          guestCount: eventReservations.guestCount,
          eventTitle: events.title,
          createdAt: eventReservations.createdAt,
        })
        .from(eventReservations)
        .leftJoin(events, eq(events.id, eventReservations.eventId))
        .orderBy(desc(eventReservations.createdAt))
        .limit(6);
    } catch (err) {
      console.error("Dashboard event metrics skipped", err);
    }

    return Response.json({
      greetingName: user.fullName.split(" ")[0] || user.fullName,
      range: rangeKey,
      rangeLabel,
      totals: {
        bookings: Number(totals?.value ?? 0),
        confirmedBookings: Number(confirmed?.value ?? 0),
        pendingBookings: Number(pending?.value ?? 0),
        cancelledBookings: Number(cancelled?.value ?? 0),
        availableRooms,
        occupancyRate,
        revenue,
        conferenceRequests: Number(conferenceCount?.value ?? 0),
        foodPreorders,
        pendingFoodOrders,
        preparingFoodOrders,
        readyFoodOrders,
        todayBookings: Number(todayBookingsRow?.value ?? 0),
        occupiedRooms: occupiedUnits,
        maintenanceRooms: maintenanceUnits,
        totalRooms: totalActiveRooms,
        upcomingEvents: upcomingEventsCount,
        publishedEvents: publishedEventsCount,
        pendingTicketOrders,
        paidTicketOrders,
        ticketsSold,
        ticketRevenue,
        pendingEventReservations,
        eventReservations: eventReservationsCount,
      },
      comparisons: {
        bookings: pctChange(periodCount, previousCount),
        revenue: pctChange(periodRevenue, previousRevenue),
        conference: pctChange(
          conferencePeriod.length,
          conferencePrevious.length,
        ),
        occupancy: {
          change: null as number | null,
          label: `${occupiedUnits} occupied of ${totalActiveRooms} active units`,
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
        occupancyTrend,
        conferenceTrend: [...conferenceTrendMap.entries()].map(
          ([date, value]) => ({ date, value }),
        ),
        preorderTrend: [...preorderTrendMap.entries()].map(([date, value]) => ({
          date,
          value,
        })),
        ticketTrend: [...ticketTrendMap.entries()].map(([date, value]) => ({
          date,
          value,
        })),
      },
      bookingStatusBreakdown: statusRows.map((r) => ({
        status: r.status,
        count: Number(r.value ?? 0),
      })),
      revenueSources: [
        { source: "Room bookings", amount: revenue },
        { source: "Event tickets", amount: ticketRevenue },
        { source: "Recorded payments", amount: paidAmount },
      ],
      availableRoomList,
      upcomingEvents,
      recentTicketOrders,
      recentEventReservations,
      recentBookings: recent,
      recentFoodOrders,
      recentNotifications,
      today,
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load dashboard.", 500);
  }
}
