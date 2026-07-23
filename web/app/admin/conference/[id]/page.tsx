import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { conferenceEnquiries, conferencePackages } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatDate, statusColor } from "@/lib/format";
import { ConferenceStatusForm } from "./status-form";

export const dynamic = "force-dynamic";

export default async function ConferenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["booking_manager"]);
  const id = Number((await params).id);
  const db = getDb();
  const [row] = await db
    .select({
      enquiry: conferenceEnquiries,
      packageName: conferencePackages.name,
    })
    .from(conferenceEnquiries)
    .leftJoin(conferencePackages, eq(conferenceEnquiries.packageId, conferencePackages.id))
    .where(eq(conferenceEnquiries.id, id))
    .limit(1);
  if (!row) notFound();
  const e = row.enquiry;
  return (
    <div className="admin-page">
      <h1>{e.reference}</h1>
      <span className="admin-badge" style={{ background: statusColor(e.status) }}>{e.status}</span>
      <section className="admin-card">
        <dl className="admin-dl">
          <div><dt>Contact</dt><dd>{e.contactName} · {e.email} · {e.phone}</dd></div>
          <div><dt>Company</dt><dd>{e.company || "—"}</dd></div>
          <div><dt>Package</dt><dd>{row.packageName || "—"}</dd></div>
          <div><dt>Event</dt><dd>{e.eventType} on {formatDate(e.preferredDate)} {e.startTime}-{e.endTime}</dd></div>
          <div><dt>Attendees</dt><dd>{e.attendees} · {e.seatingArrangement}</dd></div>
          <div><dt>Requirements</dt><dd>
            {[e.cateringRequired && "Catering", e.projectorRequired && "Projector", e.soundSystemRequired && "Sound", e.internetRequired && "Internet", e.accommodationRequired && "Accommodation"].filter(Boolean).join(", ") || "None"}
          </dd></div>
          <div><dt>Notes</dt><dd>{e.additionalNotes || "—"}</dd></div>
        </dl>
      </section>
      <ConferenceStatusForm enquiryId={e.id} currentStatus={e.status} />
    </div>
  );
}
