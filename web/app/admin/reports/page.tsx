import { requireAdminPage } from "@/lib/admin-page";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireAdminPage(["booking_manager", "administrator"]);
  return <ReportsClient />;
}
