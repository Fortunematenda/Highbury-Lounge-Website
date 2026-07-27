import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import {
  bookings,
  foodOrderItems,
  foodOrders,
  roomTypes,
} from "@/db/schema";
import { jsonError } from "@/lib/format";
import { FOOD_ORDER_STATUSES, isFoodOrderStatus } from "@/lib/food-orders";

export async function GET(request: Request) {
  try {
    await requireAdmin(["administrator", "booking_manager"]);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const status = url.searchParams.get("status") ?? "";
    const bookingStatus = url.searchParams.get("bookingStatus") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));

    const db = getDb();
    const filters: SQL[] = [];

    if (status && isFoodOrderStatus(status)) {
      filters.push(eq(foodOrders.status, status));
    }
    if (bookingStatus) {
      filters.push(eq(bookings.status, bookingStatus));
    }
    if (q) {
      const pattern = `%${q}%`;
      filters.push(
        or(
          like(foodOrders.reference, pattern),
          like(foodOrders.guestName, pattern),
          like(foodOrders.guestEmail, pattern),
          like(foodOrders.guestPhone, pattern),
          like(bookings.reference, pattern),
          like(roomTypes.name, pattern),
          like(foodOrders.status, pattern),
          like(bookings.status, pattern),
          sql`exists (
            select 1 from food_order_items foi
            where foi.food_order_id = ${foodOrders.id}
              and foi.name like ${pattern}
          )`,
        )!,
      );
    }

    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select({
        id: foodOrders.id,
        reference: foodOrders.reference,
        status: foodOrders.status,
        guestName: foodOrders.guestName,
        guestEmail: foodOrders.guestEmail,
        guestPhone: foodOrders.guestPhone,
        totalAmount: foodOrders.totalAmount,
        currency: foodOrders.currency,
        serviceDate: foodOrders.serviceDate,
        createdAt: foodOrders.createdAt,
        bookingId: foodOrders.bookingId,
        bookingReference: bookings.reference,
        bookingStatus: bookings.status,
        roomName: roomTypes.name,
      })
      .from(foodOrders)
      .leftJoin(bookings, eq(foodOrders.bookingId, bookings.id))
      .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
      .where(where)
      .orderBy(desc(foodOrders.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const orderIds = rows.map((r) => r.id);
    const itemRows =
      orderIds.length === 0
        ? []
        : await db
            .select({
              foodOrderId: foodOrderItems.foodOrderId,
              name: foodOrderItems.name,
              quantity: foodOrderItems.quantity,
            })
            .from(foodOrderItems)
            .where(
              sql`${foodOrderItems.foodOrderId} in (${sql.join(
                orderIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            );

    const itemsByOrder = new Map<number, Array<{ name: string; quantity: number }>>();
    for (const item of itemRows) {
      const list = itemsByOrder.get(item.foodOrderId) ?? [];
      list.push({ name: item.name, quantity: item.quantity });
      itemsByOrder.set(item.foodOrderId, list);
    }

    const [countRow] = await db
      .select({ value: sql<number>`count(*)` })
      .from(foodOrders)
      .leftJoin(bookings, eq(foodOrders.bookingId, bookings.id))
      .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
      .where(where);

    return Response.json({
      foodOrders: rows.map((row) => ({
        ...row,
        items: itemsByOrder.get(row.id) ?? [],
        itemSummary: (itemsByOrder.get(row.id) ?? [])
          .map((i) => `${i.name} x${i.quantity}`)
          .join(", "),
      })),
      total: Number(countRow?.value ?? 0),
      page,
      limit,
      statuses: FOOD_ORDER_STATUSES,
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load food orders.", 500);
  }
}
