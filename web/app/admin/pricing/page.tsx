import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";

/** Pricing lives on each room — keep this URL working as a redirect. */
export default async function PricingPage() {
  await requireAdminPage(["content_manager"]);
  redirect("/admin/rooms");
}
