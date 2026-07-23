import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { conferenceEnquiries } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatDate, statusColor } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminConferencePage() {
  await requireAdminPage(["booking_manager"]);
  const db = getDb();
  const rows = await db.select().from(conferenceEnquiries).orderBy(desc(conferenceEnquiries.createdAt));
  return (
    <div className="admin-page">
      <h1>Conference enquiries</h1>
      <section className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reference</th><th>Contact</th><th>Date</th><th>Attendees</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.reference}</td>
                <td>{r.contactName}<br /><small>{r.email}</small></td>
                <td>{formatDate(r.preferredDate)}</td>
                <td>{r.attendees}</td>
                <td><span className="admin-badge" style={{ background: statusColor(r.status) }}>{r.status}</span></td>
                <td><Link href={`/admin/conference/${r.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
