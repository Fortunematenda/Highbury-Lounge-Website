import { listPublishedUpcoming } from "@/lib/events";
import { HomePage } from "./home-page-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  let initialEvents: Awaited<ReturnType<typeof listPublishedUpcoming>> = [];
  try {
    initialEvents = await listPublishedUpcoming({ limit: 3 });
  } catch {
    initialEvents = [];
  }

  return <HomePage initialEvents={initialEvents} />;
}
