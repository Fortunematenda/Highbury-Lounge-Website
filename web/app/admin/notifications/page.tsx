import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { NotificationsClient } from "../components/NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAdminPage();
  const db = getDb();
  const rows = await db
    .select({
      id: notifications.id,
      templateKey: notifications.templateKey,
      recipientEmail: notifications.recipientEmail,
      subject: notifications.subject,
      status: notifications.status,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  return <NotificationsClient emailRows={rows} />;
}
