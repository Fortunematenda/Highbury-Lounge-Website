import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { foodOrders, foodOrderItems } from "@/db/schema";
import { jsonError } from "@/lib/format";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const reference = (await params).reference.trim().toUpperCase();
    const db = getDb();
    const [order] = await db
      .select()
      .from(foodOrders)
      .where(eq(foodOrders.reference, reference))
      .limit(1);
    if (!order) return jsonError("Food order not found.", 404);
    const items = await db
      .select()
      .from(foodOrderItems)
      .where(eq(foodOrderItems.foodOrderId, order.id));
    return Response.json({
      ok: true,
      order: {
        reference: order.reference,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        currency: order.currency,
        guestName: order.guestName,
        serviceDate: order.serviceDate,
        serviceTime: order.serviceTime,
        serviceType: order.serviceType,
        bookingId: order.bookingId,
      },
      items: items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
    });
  } catch (error) {
    console.error(error);
    return jsonError("Unable to load food order.", 500);
  }
}
