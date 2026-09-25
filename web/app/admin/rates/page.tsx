import { asc } from "drizzle-orm";
import { CalendarRange } from "lucide-react";
import { getDb } from "@/db";
import { roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { isBeds24Enabled } from "@/lib/channel-manager";
import {
  DetailPageShell,
  DetailSectionCard,
} from "@/app/admin/components/detail-page";
import { RatesAvailabilityClient } from "./rates-client";

export const dynamic = "force-dynamic";

export default async function RatesAvailabilityPage() {
  await requireAdminPage(["administrator", "booking_manager", "content_manager"]);
  const db = getDb();
  const rooms = await db
    .select({ id: roomTypes.id, name: roomTypes.name })
    .from(roomTypes)
    .orderBy(asc(roomTypes.displayOrder), asc(roomTypes.name));

  return (
    <DetailPageShell
      pageTitle="Rates & availability"
      breadcrumbs={[
        { label: "Stay" },
        { label: "Rates & availability" },
      ]}
      title="Rates & availability"
      description={
        isBeds24Enabled()
          ? "Updates are sent to Beds24 for mapped rooms. Unmapped rooms are rejected."
          : "Beds24 synchronisation is disabled — changes apply to Highbury local pricing only."
      }
      backAction={{ label: "Back to rooms", href: "/admin/rooms" }}
    >
      {!isBeds24Enabled() ? (
        <div className="admin-warn" role="status" style={{ marginBottom: 16 }}>
          Beds24 synchronisation is disabled.
        </div>
      ) : null}
      <DetailSectionCard title="Update date range" icon={CalendarRange}>
        <RatesAvailabilityClient rooms={rooms} />
      </DetailSectionCard>
    </DetailPageShell>
  );
}
