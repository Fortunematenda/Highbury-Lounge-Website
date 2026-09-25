import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { isBeds24Enabled } from "@/lib/channel-manager";
import { ManualBookingForm } from "./manual-booking-form";

export const dynamic = "force-dynamic";

export default async function NewManualBookingPage() {
  await requireAdminPage(["booking_manager"]);
  const db = getDb();
  const rooms = await db
    .select({ id: roomTypes.id, name: roomTypes.name })
    .from(roomTypes)
    .where(and(eq(roomTypes.isActive, true)))
    .orderBy(asc(roomTypes.displayOrder), asc(roomTypes.name));

  return (
    <div className="admin-page pms-page">
      <header className="pms-page-header">
        <div className="pms-page-header-copy">
          <p className="pms-eyebrow">Operations</p>
          <h1>New manual booking</h1>
          <p className="pms-page-sub">
            Phone, WhatsApp, walk-in or email reservations
            {isBeds24Enabled()
              ? " — syncs to Beds24 immediately when enabled."
              : " — local Highbury inventory only while Beds24 is disabled."}
          </p>
        </div>
      </header>
      <section className="admin-card">
        <ManualBookingForm rooms={rooms} />
      </section>
    </div>
  );
}
