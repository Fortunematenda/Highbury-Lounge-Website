import Link from "next/link";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookings,
  foodOrderItems,
  foodOrders,
  roomTypes,
} from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { FOOD_ORDER_STATUSES, isFoodOrderStatus } from "@/lib/food-orders";
import { FoodOrdersList } from "./food-orders-list";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminFoodOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPage(["booking_manager"]);
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const bookingStatus = params.bookingStatus ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

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

  let list: Array<{
    id: number;
    reference: string;
    status: string;
    guestName: string | null;
    totalAmount: number;
    currency: string;
    createdAt: string;
    bookingId: number | null;
    bookingReference: string | null;
    bookingStatus: string | null;
    roomName: string | null;
    itemSummary: string;
  }> = [];
  let schemaMissing = false;

  try {
    const rows = await db
      .select({
        id: foodOrders.id,
        reference: foodOrders.reference,
        status: foodOrders.status,
        guestName: foodOrders.guestName,
        totalAmount: foodOrders.totalAmount,
        currency: foodOrders.currency,
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
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

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

    const itemsByOrder = new Map<number, string>();
    for (const item of itemRows) {
      const prev = itemsByOrder.get(item.foodOrderId);
      const next = `${item.name} x${item.quantity}`;
      itemsByOrder.set(
        item.foodOrderId,
        prev ? `${prev}, ${next}` : next,
      );
    }

    list = rows.map((row) => ({
      ...row,
      itemSummary: itemsByOrder.get(row.id) ?? "—",
    }));
  } catch (err) {
    console.error("Admin food orders query failed", err);
    schemaMissing = true;
  }

  const bookingStatuses = [
    "Pending",
    "Awaiting Payment",
    "Confirmed",
    "Checked In",
    "Checked Out",
    "Cancelled",
    "Declined",
  ];

  return (
    <div className="admin-page pms-page">
      <header className="pms-page-header">
        <div className="pms-page-header-copy">
          <p className="pms-eyebrow">Operations</p>
          <h1>Food Orders</h1>
          <p className="pms-page-sub">
            Kitchen pre-orders from bookings and standalone guest requests
          </p>
        </div>
      </header>

      {schemaMissing ? (
        <div className="admin-error" role="alert">
          Food order tables are missing. Apply D1 migration{" "}
          <code>0005_food_orders</code> and reload.
        </div>
      ) : null}

      <form className="admin-filters" method="get">
        <input
          className="admin-input"
          name="q"
          placeholder="Search booking, guest, menu item, room, status"
          defaultValue={q}
        />
        <select className="admin-input" name="status" defaultValue={status}>
          <option value="">All food statuses</option>
          {FOOD_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          name="bookingStatus"
          defaultValue={bookingStatus}
        >
          <option value="">All booking statuses</option>
          {bookingStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="admin-btn" type="submit">
          Filter
        </button>
        {(q || status || bookingStatus) && (
          <Link className="admin-btn ghost" href="/admin/food-orders">
            Clear
          </Link>
        )}
      </form>

      <FoodOrdersList rows={list} />

      <div className="admin-pagination">
        {page > 1 ? (
          <Link
            className="admin-btn ghost"
            href={`/admin/food-orders?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(status ? { status } : {}),
              ...(bookingStatus ? { bookingStatus } : {}),
              page: String(page - 1),
            }).toString()}`}
          >
            Previous
          </Link>
        ) : null}
        <span className="admin-muted">Page {page}</span>
        {list.length === PAGE_SIZE ? (
          <Link
            className="admin-btn ghost"
            href={`/admin/food-orders?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(status ? { status } : {}),
              ...(bookingStatus ? { bookingStatus } : {}),
              page: String(page + 1),
            }).toString()}`}
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}
