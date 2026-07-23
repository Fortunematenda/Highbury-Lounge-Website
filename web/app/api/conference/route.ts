import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { conferenceEnquiries, conferencePackages } from "@/db/schema";
import { jsonError } from "@/lib/format";
import { queueNotification } from "@/lib/notifications";

function enquiryReference() {
  return `CE-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const contactName = String(body.contactName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const eventType = String(body.eventType ?? "").trim();
    const preferredDate = String(body.preferredDate ?? "").trim();
    const startTime = String(body.startTime ?? "").trim();
    const endTime = String(body.endTime ?? "").trim();
    const attendees = Number(body.attendees ?? 0);

    if (
      !contactName ||
      !email ||
      !phone ||
      !eventType ||
      !preferredDate ||
      !startTime ||
      !endTime ||
      attendees < 1
    ) {
      return jsonError("Please complete all required conference enquiry fields.", 400);
    }

    const db = getDb();
    const packageId = body.packageId ? Number(body.packageId) : null;
    let packageName = "Conference venue";
    if (packageId) {
      const [pkg] = await db
        .select()
        .from(conferencePackages)
        .where(eq(conferencePackages.id, packageId))
        .limit(1);
      if (pkg) packageName = pkg.name;
    }

    const reference = enquiryReference();
    const [enquiry] = await db
      .insert(conferenceEnquiries)
      .values({
        reference,
        packageId,
        contactName,
        company: String(body.company ?? "").trim() || null,
        email,
        phone,
        whatsapp: String(body.whatsapp ?? "").trim() || null,
        eventType,
        preferredDate,
        alternativeDate: String(body.alternativeDate ?? "").trim() || null,
        startTime,
        endTime,
        attendees,
        seatingArrangement: String(body.seatingArrangement ?? "").trim() || null,
        cateringRequired: Boolean(body.cateringRequired),
        projectorRequired: Boolean(body.projectorRequired),
        soundSystemRequired: Boolean(body.soundSystemRequired),
        internetRequired: Boolean(body.internetRequired),
        accommodationRequired: Boolean(body.accommodationRequired),
        cateringNotes: String(body.cateringNotes ?? "").trim() || null,
        additionalNotes: String(body.additionalNotes ?? "").trim() || null,
        status: "New Enquiry",
      })
      .returning();

    await queueNotification({
      templateKey: "conference_enquiry_received",
      recipientEmail: email,
      recipientName: contactName,
      context: {
        guestName: contactName,
        reference,
        eventDetails: `${packageName} · ${eventType} · ${preferredDate} ${startTime}-${endTime} · ${attendees} attendees`,
        status: "New Enquiry",
      },
      relatedType: "conference_enquiry",
      relatedId: enquiry.id,
    });

    return Response.json({ ok: true, enquiry: { id: enquiry.id, reference } }, { status: 201 });
  } catch {
    return jsonError("Unable to submit conference enquiry.", 500);
  }
}

export async function GET() {
  try {
    const db = getDb();
    const packages = await db
      .select()
      .from(conferencePackages)
      .where(eq(conferencePackages.isActive, true));
    return Response.json({ packages });
  } catch {
    return jsonError("Unable to load conference packages.", 500);
  }
}
