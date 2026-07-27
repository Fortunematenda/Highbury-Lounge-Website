import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookingExtras,
  bookings,
  foodOrderItems,
  foodOrders,
  menuItems,
  roomTypes,
} from "@/db/schema";
import { createAdminNotification } from "@/lib/admin-notifications";
import {
  isFoodOrderStatus,
  type FoodOrderStatus,
} from "@/lib/food-order-status";

export {
  FOOD_ORDER_STATUSES,
  isFoodOrderStatus,
  type FoodOrderStatus,
} from "@/lib/food-order-status";

export type FoodOrderItemInput = {
  menuItemId: number;
  quantity: number;
  specialInstructions?: string | null;
};

export type CreateFoodOrderInput = {
  bookingId?: number | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  serviceDate?: string | null;
  serviceTime?: string | null;
  serviceType?: string | null;
  specialInstructions?: string | null;
  currency?: string;
  items: FoodOrderItemInput[];
};

export class FoodOrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function foodOrderReference() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `FO-${stamp}-${rand}`;
}

async function resolveItems(items: FoodOrderItemInput[]) {
  if (!items.length) {
    throw new FoodOrderError("Add at least one menu item.", 400);
  }

  const db = getDb();
  const ids = [...new Set(items.map((i) => i.menuItemId))];
  const rows = await db
    .select()
    .from(menuItems)
    .where(
      and(
        inArray(menuItems.id, ids),
        eq(menuItems.isActive, true),
        isNull(menuItems.archivedAt),
      ),
    );

  const byId = new Map(rows.map((r) => [r.id, r]));
  const resolved: Array<{
    menuItemId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    imageUrl: string | null;
    specialInstructions: string | null;
  }> = [];

  for (const item of items) {
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty < 1) {
      throw new FoodOrderError("Quantity must be at least 1.", 400);
    }
    const menu = byId.get(item.menuItemId);
    if (!menu) {
      throw new FoodOrderError("One or more menu items are unavailable.", 400);
    }
    if (!menu.allowPreOrder) {
      throw new FoodOrderError(
        `"${menu.name}" is not available for pre-order.`,
        400,
      );
    }
    if (!menu.isAvailable) {
      throw new FoodOrderError(`"${menu.name}" is currently unavailable.`, 400);
    }
    const unitPrice =
      menu.promotionalPrice != null && menu.promotionalPrice > 0
        ? menu.promotionalPrice
        : menu.price;
    resolved.push({
      menuItemId: menu.id,
      name: menu.name,
      quantity: qty,
      unitPrice,
      totalPrice: Math.round(unitPrice * qty * 100) / 100,
      imageUrl: menu.imageUrl,
      specialInstructions: item.specialInstructions?.trim() || null,
    });
  }

  return resolved;
}

/** Create a food order and line items. Rolls back the order header on item failure. */
export async function createFoodOrder(input: CreateFoodOrderInput) {
  const db = getDb();
  const resolved = await resolveItems(input.items);
  const totalAmount =
    Math.round(resolved.reduce((s, i) => s + i.totalPrice, 0) * 100) / 100;
  const currency = input.currency ?? "USD";
  const reference = foodOrderReference();

  const bookingId = input.bookingId ?? null;
  if (bookingId != null) {
    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) throw new FoodOrderError("Booking not found.", 404);
    const [existing] = await db
      .select({ id: foodOrders.id })
      .from(foodOrders)
      .where(eq(foodOrders.bookingId, bookingId))
      .limit(1);
    if (existing) {
      throw new FoodOrderError(
        "This booking already has a food pre-order.",
        409,
      );
    }
  }

  const [order] = await db
    .insert(foodOrders)
    .values({
      reference,
      bookingId,
      guestName: input.guestName?.trim() || null,
      guestEmail: input.guestEmail?.trim().toLowerCase() || null,
      guestPhone: input.guestPhone?.trim() || null,
      serviceDate: input.serviceDate || null,
      serviceTime: input.serviceTime || null,
      serviceType: input.serviceType || null,
      status: "Pending",
      specialInstructions: input.specialInstructions?.trim() || null,
      totalAmount,
      currency,
    })
    .returning();

  if (!order) throw new FoodOrderError("Could not create food order.", 500);

  try {
    for (const item of resolved) {
      await db.insert(foodOrderItems).values({
        foodOrderId: order.id,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        specialInstructions: item.specialInstructions,
        imageUrl: item.imageUrl,
      });

      if (bookingId != null) {
        await db.insert(bookingExtras).values({
          bookingId,
          foodOrderId: order.id,
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          specialInstructions: item.specialInstructions,
          imageUrl: item.imageUrl,
        });
      }
    }

    if (bookingId != null) {
      const [booking] = await db
        .select({ totalAmount: bookings.totalAmount })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);
      const nextTotal =
        Math.round(((booking?.totalAmount ?? 0) + totalAmount) * 100) / 100;
      await db
        .update(bookings)
        .set({
          extrasTotal: totalAmount,
          totalAmount: nextTotal,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(bookings.id, bookingId));
    }
  } catch (error) {
    await db
      .delete(bookingExtras)
      .where(eq(bookingExtras.foodOrderId, order.id));
    await db.delete(foodOrders).where(eq(foodOrders.id, order.id));
    throw error;
  }

  await createAdminNotification({
    type: "food_preorder",
    title: bookingId ? "Food pre-order with booking" : "New food pre-order",
    message: `${reference} · ${resolved.length} item(s) · ${currency} ${totalAmount.toFixed(2)}`,
    entityType: "food_order",
    entityId: order.id,
    actionUrl: `/admin/food-orders/${order.id}`,
  });

  return { order, items: resolved };
}

export async function attachFoodOrderToBooking(params: {
  bookingId: number;
  currency: string;
  specialInstructions?: string | null;
  items: FoodOrderItemInput[];
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  serviceDate?: string | null;
}) {
  if (!params.items.length) {
    return {
      order: null,
      items: [] as Awaited<ReturnType<typeof resolveItems>>,
      extrasTotal: 0,
    };
  }

  const result = await createFoodOrder({
    bookingId: params.bookingId,
    currency: params.currency,
    specialInstructions: params.specialInstructions,
    guestName: params.guestName,
    guestEmail: params.guestEmail,
    guestPhone: params.guestPhone,
    serviceDate: params.serviceDate,
    serviceType: "room_booking",
    items: params.items,
  });

  return {
    order: result.order,
    items: result.items,
    extrasTotal: result.order.totalAmount,
  };
}

export async function updateFoodOrderStatus(params: {
  foodOrderId: number;
  status: FoodOrderStatus;
  adminUserId?: number | null;
}) {
  if (!isFoodOrderStatus(params.status)) {
    throw new FoodOrderError("Invalid food order status.", 400);
  }
  const db = getDb();
  const [existing] = await db
    .select()
    .from(foodOrders)
    .where(eq(foodOrders.id, params.foodOrderId))
    .limit(1);
  if (!existing) throw new FoodOrderError("Food order not found.", 404);

  if (existing.status === params.status) {
    return existing;
  }

  const [updated] = await db
    .update(foodOrders)
    .set({
      status: params.status,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(foodOrders.id, params.foodOrderId))
    .returning();

  await createAdminNotification({
    type: "food_preorder",
    title: `Food order ${params.status.toLowerCase()}`,
    message: `${existing.reference} is now ${params.status}`,
    entityType: "food_order",
    entityId: existing.id,
    actionUrl: `/admin/food-orders/${existing.id}`,
    adminUserId: params.adminUserId ?? null,
  });

  return updated;
}

export async function getFoodOrderDetail(foodOrderId: number) {
  try {
    const db = getDb();
    const [order] = await db
      .select()
      .from(foodOrders)
      .where(eq(foodOrders.id, foodOrderId))
      .limit(1);
    if (!order) return null;

    const items = await db
      .select()
      .from(foodOrderItems)
      .where(eq(foodOrderItems.foodOrderId, foodOrderId));

    let booking: {
      id: number;
      reference: string;
      status: string;
      roomName: string | null;
    } | null = null;

    if (order.bookingId != null) {
      const [row] = await db
        .select({
          id: bookings.id,
          reference: bookings.reference,
          status: bookings.status,
          roomName: roomTypes.name,
        })
        .from(bookings)
        .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
        .where(eq(bookings.id, order.bookingId))
        .limit(1);
      booking = row ?? null;
    }

    return { order, items, booking };
  } catch (err) {
    console.error("getFoodOrderDetail failed", err);
    return null;
  }
}

export async function getFoodOrderForBooking(bookingId: number) {
  try {
    const db = getDb();
    const [order] = await db
      .select()
      .from(foodOrders)
      .where(eq(foodOrders.bookingId, bookingId))
      .limit(1);
    if (!order) {
      const extras = await db
        .select()
        .from(bookingExtras)
        .where(eq(bookingExtras.bookingId, bookingId));
      if (!extras.length) return null;
      return {
        order: null as typeof foodOrders.$inferSelect | null,
        items: extras.map((e) => ({
          id: e.id,
          foodOrderId: e.foodOrderId,
          menuItemId: e.menuItemId,
          name: e.name,
          quantity: e.quantity,
          unitPrice: e.unitPrice,
          totalPrice: e.totalPrice,
          specialInstructions: e.specialInstructions,
          imageUrl: e.imageUrl,
        })),
        specialInstructions: null as string | null,
        status: "Pending" as FoodOrderStatus,
        reference: null as string | null,
        totalAmount: extras.reduce((s, e) => s + e.totalPrice, 0),
        currency: "USD",
      };
    }

    const items = await db
      .select()
      .from(foodOrderItems)
      .where(eq(foodOrderItems.foodOrderId, order.id));

    return {
      order,
      items,
      specialInstructions: order.specialInstructions,
      status: order.status as FoodOrderStatus,
      reference: order.reference,
      totalAmount: order.totalAmount,
      currency: order.currency,
    };
  } catch (err) {
    // Missing food_orders migration must not crash booking detail RSC.
    console.error("getFoodOrderForBooking failed", err);
    return null;
  }
}
