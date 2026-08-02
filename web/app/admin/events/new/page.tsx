import { requireAdminPage } from "@/lib/admin-page";
import { EventForm } from "../event-form";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireAdminPage(["content_manager"]);
  return <EventForm mode="create" />;
}
