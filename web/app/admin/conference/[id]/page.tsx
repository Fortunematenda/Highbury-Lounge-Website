import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Building2, ClipboardList, UserRound } from "lucide-react";
import { getDb } from "@/db";
import { conferenceEnquiries, conferencePackages } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatDate } from "@/lib/format";
import { formatVenueDateTime } from "@/lib/timezone";
import {
  DetailMetadataCard,
  DetailPageShell,
  DetailSectionCard,
  StatusBadge,
} from "@/app/admin/components/detail-page";
import { ConferenceStatusForm } from "./status-form";

export const dynamic = "force-dynamic";

export default async function ConferenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["booking_manager"]);
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const db = getDb();
  const [row] = await db
    .select({
      enquiry: conferenceEnquiries,
      packageName: conferencePackages.name,
    })
    .from(conferenceEnquiries)
    .leftJoin(
      conferencePackages,
      eq(conferenceEnquiries.packageId, conferencePackages.id),
    )
    .where(eq(conferenceEnquiries.id, id))
    .limit(1);
  if (!row) notFound();
  const e = row.enquiry;

  const requirements = [
    e.cateringRequired && "Catering",
    e.projectorRequired && "Projector",
    e.soundSystemRequired && "Sound",
    e.internetRequired && "Internet",
    e.accommodationRequired && "Accommodation",
  ].filter(Boolean);

  return (
    <DetailPageShell
      pageTitle={`Conference ${e.reference}`}
      breadcrumbs={[
        { label: "Conference Requests", href: "/admin/conference" },
        { label: e.reference },
      ]}
      title={e.reference}
      description={`${e.contactName} · ${e.eventType} on ${formatDate(e.preferredDate)}`}
      status={<StatusBadge status={e.status} />}
      backAction={{
        label: "Back to conference requests",
        href: "/admin/conference",
      }}
      sidebar={
        <>
          <section className="admin-card detail-section-card">
            <div className="detail-section-head">
              <div>
                <h2>Summary</h2>
              </div>
            </div>
            <dl className="detail-meta-list">
              <div>
                <dt>Event date</dt>
                <dd>{formatDate(e.preferredDate)}</dd>
              </div>
              <div>
                <dt>Guests</dt>
                <dd>{e.attendees}</dd>
              </div>
              <div>
                <dt>Package</dt>
                <dd>{row.packageName || "—"}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{e.contactName}</dd>
              </div>
            </dl>
          </section>
          <DetailMetadataCard
            items={[
              {
                label: "Created",
                value: formatVenueDateTime(e.createdAt, { withSeconds: true }),
              },
              {
                label: "Last updated",
                value: formatVenueDateTime(e.updatedAt, { withSeconds: true }),
              },
            ]}
          />
        </>
      }
    >
      <div className="detail-form-stack">
        <DetailSectionCard title="Contact" icon={UserRound}>
          <dl className="admin-dl">
            <div>
              <dt>Name</dt>
              <dd>{e.contactName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{e.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{e.phone}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{e.company || "—"}</dd>
            </div>
          </dl>
        </DetailSectionCard>

        <DetailSectionCard title="Event details" icon={Building2}>
          <dl className="admin-dl">
            <div>
              <dt>Package</dt>
              <dd>{row.packageName || "—"}</dd>
            </div>
            <div>
              <dt>Event type</dt>
              <dd>{e.eventType}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(e.preferredDate)}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                {e.startTime} – {e.endTime}
              </dd>
            </div>
            <div>
              <dt>Attendees</dt>
              <dd>
                {e.attendees} · {e.seatingArrangement}
              </dd>
            </div>
            <div>
              <dt>Requirements</dt>
              <dd>{requirements.length ? requirements.join(", ") : "None"}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{e.additionalNotes || "—"}</dd>
            </div>
          </dl>
        </DetailSectionCard>

        <DetailSectionCard title="Update status" icon={ClipboardList}>
          <ConferenceStatusForm
            enquiryId={e.id}
            reference={e.reference}
            currentStatus={e.status}
            initialQuotationAmount={e.quotationAmount}
            initialQuotationNotes={e.quotationNotes}
            initialAdminNotes={e.adminNotes}
          />
        </DetailSectionCard>
      </div>
    </DetailPageShell>
  );
}
