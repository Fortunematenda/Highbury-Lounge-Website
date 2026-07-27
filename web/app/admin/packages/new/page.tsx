import { requireAdminPage } from "@/lib/admin-page";
import { PackageForm } from "../package-form";

export const dynamic = "force-dynamic";

export default async function NewPackagePage() {
  await requireAdminPage(["content_manager"]);
  return <PackageForm mode="create" />;
}
