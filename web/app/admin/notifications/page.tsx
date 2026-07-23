import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { isSmtpConfigured } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAdminPage();
  const db = getDb();
  const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
  const smtp = isSmtpConfigured();

  return (
    <div className="admin-page">
      <h1>Notifications</h1>
      {!smtp && (
        <div className="admin-warning">
          SMTP is not configured. Notifications are saved with status <strong>unconfigured</strong> and are not marked as delivered.
          Set SMTP_HOST, SMTP_USER and SMTP_PASS in the environment (see .env.example).
        </div>
      )}
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
