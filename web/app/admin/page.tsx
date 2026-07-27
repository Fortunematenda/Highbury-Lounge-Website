import { requireAdminPage } from "@/lib/admin-page";
import { AdminDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminPage();
  return <AdminDashboardClient />;
}
