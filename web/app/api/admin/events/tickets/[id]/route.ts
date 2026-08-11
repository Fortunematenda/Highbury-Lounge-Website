import { AuthError, requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  cancelTicketOrder,
  getTicketOrderById,
  TicketError,
  verifyTicketOrder,
} from "@/lib/event-tickets";
import { jsonError } from "@/lib/format";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(["administrator", "content_manager", "booking_manager"]);
    const id = Number((await params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid order id.", 400);
    const result = await getTicketOrderById(id);
    if (!result) return jsonError("Order not found.", 404);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load order.", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin([
      "administrator",
      "content_manager",
      "booking_manager",
    ]);
    const id = Number((await params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid order id.", 400);

    const body = (await request.json()) as {
      action?: "verify" | "cancel";
      adminNotes?: string;
    };

    if (body.action === "verify") {
      const order = await verifyTicketOrder(id, user.id, body.adminNotes);
      await writeAuditLog({
        adminUserId: user.id,
        action: "event.ticket.verify",
        entityType: "event_ticket_order",
        entityId: id,
        details: { reference: order.reference },
      });
      return Response.json({ ok: true, order });
    }

    if (body.action === "cancel") {
      const order = await cancelTicketOrder(id, body.adminNotes);
      await writeAuditLog({
        adminUserId: user.id,
        action: "event.ticket.cancel",
        entityType: "event_ticket_order",
        entityId: id,
        details: { reference: order.reference },
      });
      return Response.json({ ok: true, order });
    }

    return jsonError("Unsupported action.", 400);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof TicketError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to update order.", 500);
  }
}
