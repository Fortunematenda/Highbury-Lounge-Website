import { AuthError, requireAdmin } from "@/lib/auth";
import { listTicketOrders } from "@/lib/event-tickets";
import { jsonError } from "@/lib/format";

export async function GET(request: Request) {
  try {
    await requireAdmin(["administrator", "content_manager", "booking_manager"]);
    const url = new URL(request.url);
    const eventIdRaw = url.searchParams.get("eventId");
    const status = url.searchParams.get("status") || undefined;
    const eventId = eventIdRaw ? Number(eventIdRaw) : undefined;

    const rows = await listTicketOrders({
      eventId: Number.isFinite(eventId) ? eventId : undefined,
      status,
    });

    return Response.json({
      ok: true,
      orders: rows.map((row) => ({
        ...row.order,
        eventTitle: row.eventTitle,
        eventSlug: row.eventSlug,
        eventStartAt: row.eventStartAt,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to list ticket orders.", 500);
  }
}
