import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";

/** Legacy URL — rates & availability now live at /admin/rates */
export default async function PricingPage() {
  await requireAdminPage(["content_manager", "booking_manager"]);
  redirect("/admin/rates");
}
