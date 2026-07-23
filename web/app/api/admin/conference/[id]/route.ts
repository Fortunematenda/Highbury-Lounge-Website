import { eq, sql } from "drizzle-orm";
import { AuthError, canManageBookings, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { conferenceEnquiries } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { queueNotification } from "@/lib/notifications";

const STATUSES = new Set([
  "New Enquiry",
  "Contacted",
  "Quotation Sent",
  "Awaiting Approval",
  "Approved",
  "Confirmed",
  "Declined",
  "Cancelled",
  "Completed",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "booking_manager"]);
    if (!canManageBookings(user.roleKey)) return jsonError("Forbidden", 403);

    const { id } = await context.params;
    const enquiryId = Number(id);
    if (!Number.isFinite(enquiryId)) return jsonError("Invalid id.", 400);

    const body = await request.json();
    const db = getDb();
    const [existing] = await db
      .select()
      .from(conferenceEnquiries)
      .where(eq(conferenceEnquiries.id, enquiryId))
      .limit(1);
    if (!existing) return jsonError("Enquiry not found.", 404);

    const patch: Record<string, unknown> = {
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    if (body.status != null) {
      const status = String(body.status);
      if (!STATUSES.has(status)) return jsonError("Invalid status.", 400);
      patch.status = status;
    }
    if (body.adminNotes !== undefined) {
      patch.adminNotes = body.adminNotes ? String(body.adminNotes) : null;
    }
    if (body.quotationAmount !== undefined) {
      patch.quotationAmount =
        body.quotationAmount === null || body.quotationAmount === ""
          ? null
          : Number(body.quotationAmount);
    }
    if (body.quotationNotes !== undefined) {
      patch.quotationNotes = body.quotationNotes
        ? String(body.quotationNotes)
        : null;
    }

    await db
      .update(conferenceEnquiries)
      .set(patch)
      .where(eq(conferenceEnquiries.id, enquiryId));

    const newStatus = (patch.status as string) ?? existing.status;
    if (
      newStatus === "Quotation Sent" ||
      newStatus === "Confirmed"
    ) {
      const templateKey =
        newStatus === "Confirmed"
          ? "conference_booking_confirmed"
          : "conference_quotation_sent";
      await queueNotification({
        templateKey,
        recipientEmail: existing.email,
        recipientName: existing.contactName,
        context: {
          guestName: existing.contactName,
          reference: existing.reference,
          eventDetails: `${existing.eventType} on ${existing.preferredDate} (${existing.attendees} attendees)`,
          total:
            patch.quotationAmount != null
              ? `USD ${Number(patch.quotationAmount).toFixed(2)}`
              : existing.quotationAmount != null
                ? `USD ${existing.quotationAmount.toFixed(2)}`
                : undefined,
          status: newStatus,
        },
        relatedType: "conference_enquiry",
        relatedId: enquiryId,
      });
    }

    await writeAuditLog({
      adminUserId: user.id,
      action: "conference.update",
      entityType: "conference_enquiry",
      entityId: enquiryId,
      details: body,
    });

    const [row] = await db
      .select()
      .from(conferenceEnquiries)
      .where(eq(conferenceEnquiries.id, enquiryId))
      .limit(1);

    return Response.json({ ok: true, enquiry: row });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not update enquiry.", 500);
  }
}
