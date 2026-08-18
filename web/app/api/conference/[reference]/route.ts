import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { conferenceEnquiries } from "@/db/schema";
import { jsonError } from "@/lib/format";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const reference = (await params).reference.trim().toUpperCase();
    const db = getDb();
    const [enquiry] = await db
      .select({
        reference: conferenceEnquiries.reference,
        contactName: conferenceEnquiries.contactName,
        email: conferenceEnquiries.email,
        eventType: conferenceEnquiries.eventType,
        preferredDate: conferenceEnquiries.preferredDate,
        attendees: conferenceEnquiries.attendees,
        status: conferenceEnquiries.status,
        paymentStatus: conferenceEnquiries.paymentStatus,
        quotationAmount: conferenceEnquiries.quotationAmount,
        quotationNotes: conferenceEnquiries.quotationNotes,
      })
      .from(conferenceEnquiries)
      .where(eq(conferenceEnquiries.reference, reference))
      .limit(1);
    if (!enquiry) return jsonError("Enquiry not found.", 404);
    return Response.json({ ok: true, enquiry });
  } catch (error) {
    console.error(error);
    return jsonError("Unable to load enquiry.", 500);
  }
}
