import { getTicketOrderByReference } from "@/lib/event-tickets";
import { jsonError } from "@/lib/format";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const { reference } = await params;
    const result = await getTicketOrderByReference(reference);
    if (!result?.order || !result.event) {
      return jsonError("Ticket order not found.", 404);
    }

    return Response.json({
      ok: true,
      order: {
        reference: result.order.reference,
        paymentStatus: result.order.paymentStatus,
        ticketTypeName: result.order.ticketTypeName,
        quantity: result.order.quantity,
        unitPrice: result.order.unitPrice,
        totalAmount: result.order.totalAmount,
        currency: result.order.currency,
        fullName: result.order.fullName,
        email: result.order.email,
        phone: result.order.phone,
        ticketCode: result.order.ticketCode,
        createdAt: result.order.createdAt,
        verifiedAt: result.order.verifiedAt,
      },
      event: {
        title: result.event.title,
        slug: result.event.slug,
        startAt: result.event.startAt,
        endAt: result.event.endAt,
        venueName: result.event.venueName,
        venueAddress: result.event.venueAddress,
        coverImage: result.event.coverImage,
      },
      bank: result.bank,
    });
  } catch (error) {
    console.error(error);
    return jsonError("Unable to load ticket order.", 500);
  }
}
