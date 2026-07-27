import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import {
  bookingGuests,
  bookings,
  conferenceEnquiries,
  foodOrders,
  menuItems,
  roomTypes,
} from "@/db/schema";
import { jsonError } from "@/lib/format";

type SearchHit = {
  id: string;
  title: string;
  description: string;
  href: string;
  group: string;
};

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return Response.json({ results: [] as SearchHit[] });
    }

    const pattern = `%${q}%`;
    const db = getDb();
    const results: SearchHit[] = [];

    const bookingRows = await db
      .select({
        id: bookings.id,
        reference: bookings.reference,
        status: bookings.status,
        checkIn: bookings.checkIn,
        roomName: roomTypes.name,
        firstName: bookingGuests.firstName,
        lastName: bookingGuests.lastName,
      })
      .from(bookings)
      .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
      .leftJoin(bookingGuests, eq(bookingGuests.bookingId, bookings.id))
      .where(
        or(
          like(bookings.reference, pattern),
          like(bookingGuests.email, pattern),
          like(bookingGuests.phone, pattern),
          like(bookingGuests.firstName, pattern),
          like(bookingGuests.lastName, pattern),
          like(roomTypes.name, pattern),
          like(roomTypes.slug, pattern),
          sql`(${bookingGuests.firstName} || ' ' || ${bookingGuests.lastName}) like ${pattern}`,
        ),
      )
      .orderBy(desc(bookings.createdAt))
      .limit(8);

    for (const row of bookingRows) {
      results.push({
        id: `booking-${row.id}`,
        title: row.reference,
        description: `${row.firstName ?? ""} ${row.lastName ?? ""} · ${row.roomName ?? "Room"} · ${row.status}`,
        href: `/admin/bookings/${row.id}`,
        group: "Bookings",
      });
    }

    const foodRows = await db
      .select({
        id: foodOrders.id,
        reference: foodOrders.reference,
        status: foodOrders.status,
        guestName: foodOrders.guestName,
        totalAmount: foodOrders.totalAmount,
        currency: foodOrders.currency,
      })
      .from(foodOrders)
      .where(
        or(
          like(foodOrders.reference, pattern),
          like(foodOrders.guestName, pattern),
          like(foodOrders.guestEmail, pattern),
          like(foodOrders.guestPhone, pattern),
          like(foodOrders.status, pattern),
        ),
      )
      .orderBy(desc(foodOrders.createdAt))
      .limit(6);

    for (const row of foodRows) {
      results.push({
        id: `food-${row.id}`,
        title: row.reference,
        description: `${row.guestName ?? "Guest"} · ${row.status} · ${row.currency} ${Number(row.totalAmount).toFixed(2)}`,
        href: `/admin/food-orders/${row.id}`,
        group: "Food Orders",
      });
    }

    const guestRows = await db
      .selectDistinct({
        email: bookingGuests.email,
        firstName: bookingGuests.firstName,
        lastName: bookingGuests.lastName,
        phone: bookingGuests.phone,
      })
      .from(bookingGuests)
      .where(
        or(
          like(bookingGuests.email, pattern),
          like(bookingGuests.firstName, pattern),
          like(bookingGuests.lastName, pattern),
          like(bookingGuests.phone, pattern),
        ),
      )
      .limit(6);

    for (const guest of guestRows) {
      results.push({
        id: `guest-${guest.email}`,
        title: `${guest.firstName} ${guest.lastName}`,
        description: `${guest.email}${guest.phone ? ` · ${guest.phone}` : ""}`,
        href: `/admin/bookings?q=${encodeURIComponent(guest.email)}`,
        group: "Guests",
      });
    }

    const roomRows = await db
      .select()
      .from(roomTypes)
      .where(or(like(roomTypes.name, pattern), like(roomTypes.slug, pattern)))
      .limit(6);

    for (const room of roomRows) {
      results.push({
        id: `room-${room.id}`,
        title: room.name,
        description: `${room.isActive ? "Active" : "Inactive"} · ${room.inventoryCount} units`,
        href: `/admin/rooms/${room.id}`,
        group: "Rooms",
      });
    }

    const conferenceRows = await db
      .select()
      .from(conferenceEnquiries)
      .where(
        or(
          like(conferenceEnquiries.reference, pattern),
          like(conferenceEnquiries.contactName, pattern),
          like(conferenceEnquiries.email, pattern),
          like(conferenceEnquiries.company, pattern),
        ),
      )
      .orderBy(desc(conferenceEnquiries.createdAt))
      .limit(6);

    for (const row of conferenceRows) {
      results.push({
        id: `conference-${row.id}`,
        title: row.reference,
        description: `${row.contactName} · ${row.status} · ${row.preferredDate}`,
        href: `/admin/conference/${row.id}`,
        group: "Conference",
      });
    }

    const menuRows = await db
      .select()
      .from(menuItems)
      .where(
        and(
          sql`${menuItems.archivedAt} is null`,
          or(
            like(menuItems.name, pattern),
            like(menuItems.slug, pattern),
            like(menuItems.sku, pattern),
          ),
        ),
      )
      .limit(8);

    for (const item of menuRows) {
      results.push({
        id: `menu-${item.id}`,
        title: item.name,
        description: `${item.itemType} · ${item.isAvailable ? "Available" : "Unavailable"}`,
        href: `/admin/menus/items/${item.id}`,
        group: "Menu products",
      });
    }

    return Response.json({ results });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Search failed.", 500);
  }
}
