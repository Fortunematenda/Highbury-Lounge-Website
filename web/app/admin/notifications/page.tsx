import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAdminPage();
  const db = getDb();
  const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);

  return (
    <div className="admin-page">
      <h1>Notifications</h1>
      <section className="admin-card">
        <table className="admin-table">
          <thead>
            <tr><th>Template</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Created</th></tr>
          </thead>
          <tbody>
            {rows.map((n) => (
              <tr key={n.id}>
                <td>{n.templateKey}</td>
                <td>{n.recipientEmail}</td>
                <td>{n.subject}</td>
                <td>{n.status}</td>
                <td>{n.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
