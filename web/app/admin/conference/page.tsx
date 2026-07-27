import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { conferenceEnquiries } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { ConferenceList } from "./conference-list";

export const dynamic = "force-dynamic";

export default async function AdminConferencePage() {
  await requireAdminPage(["booking_manager"]);
  const db = getDb();
  const rows = await db
    .select()
    .from(conferenceEnquiries)
    .orderBy(desc(conferenceEnquiries.createdAt));
  return (
    <div className="admin-page">
      <h1>Conference enquiries</h1>
      <section className="admin-card">
        <ConferenceList rows={rows} />
      </section>
    </div>
  );
}
