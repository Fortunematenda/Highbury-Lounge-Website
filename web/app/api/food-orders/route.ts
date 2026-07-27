import { createFoodOrder, FoodOrderError } from "@/lib/food-orders";
import { jsonError } from "@/lib/format";

const recentSubmissions = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      guestName?: string;
      guestEmail?: string;
      guestPhone?: string;
      serviceDate?: string;
      serviceTime?: string;
      serviceType?: string;
      specialInstructions?: string;
      bookingReference?: string;
      items?: Array<{
        menuItemId?: number;
        quantity?: number;
        specialInstructions?: string;
      }>;
    };

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    const key = `${ip}:${(body.guestPhone || body.guestEmail || "anon").toLowerCase()}`;
    const now = Date.now();
    const last = recentSubmissions.get(key) ?? 0;
    if (now - last < 15_000) {
      return jsonError("Please wait a moment before submitting again.", 429);
    }
    recentSubmissions.set(key, now);

    const items = (body.items ?? [])
      .map((item) => ({
        menuItemId: Number(item.menuItemId),
        quantity: Number(item.quantity ?? 1),
        specialInstructions: item.specialInstructions ?? null,
      }))
      .filter((item) => Number.isFinite(item.menuItemId) && item.menuItemId > 0);

    if (!body.guestName?.trim() || !body.guestPhone?.trim()) {
      return jsonError("Name and phone are required.", 400);
    }
    if (!body.serviceDate) {
      return jsonError("Service date is required.", 400);
    }

    const notes = [
      body.specialInstructions?.trim() || "",
      body.bookingReference?.trim()
        ? `Booking / room ref: ${body.bookingReference.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await createFoodOrder({
      guestName: body.guestName,
      guestEmail: body.guestEmail,
      guestPhone: body.guestPhone,
      serviceDate: body.serviceDate,
      serviceTime: body.serviceTime,
      serviceType: body.serviceType || "standalone",
      specialInstructions: notes || null,
      items,
    });

    return Response.json(
      {
        ok: true,
        foodOrder: {
          id: result.order.id,
          reference: result.order.reference,
          status: result.order.status,
          totalAmount: result.order.totalAmount,
          currency: result.order.currency,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof FoodOrderError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Unable to create food order.", 500);
  }
}
