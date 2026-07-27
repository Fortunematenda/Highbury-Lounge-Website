import { AuthError, canManageBookings, requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  FoodOrderError,
  getFoodOrderDetail,
  isFoodOrderStatus,
  updateFoodOrderStatus,
} from "@/lib/food-orders";
import { jsonError } from "@/lib/format";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(["administrator", "booking_manager"]);
    const { id } = await context.params;
    const foodOrderId = Number(id);
    if (!Number.isFinite(foodOrderId)) {
      return jsonError("Invalid food order id.", 400);
    }

    const detail = await getFoodOrderDetail(foodOrderId);
    if (!detail) return jsonError("Food order not found.", 404);

    return Response.json(detail);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load food order.", 500);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "booking_manager"]);
    if (!canManageBookings(user.roleKey)) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await context.params;
    const foodOrderId = Number(id);
    if (!Number.isFinite(foodOrderId)) {
      return jsonError("Invalid food order id.", 400);
    }

    const body = await request.json();
    const status = String(body.status ?? "");
    if (!isFoodOrderStatus(status)) {
      return jsonError("Invalid food order status.", 400);
    }

    const updated = await updateFoodOrderStatus({
      foodOrderId,
      status,
      adminUserId: user.id,
    });

    await writeAuditLog({
      actor: user,
      action: "food_order.status_update",
      entityType: "food_order",
      entityId: foodOrderId,
      details: { status, reference: updated?.reference },
    });

    return Response.json({ ok: true, foodOrder: updated });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof FoodOrderError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Unable to update food order.", 500);
  }
}
