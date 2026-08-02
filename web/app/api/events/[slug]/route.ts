import { getPublishedEventBySlug, getRelatedEvents } from "@/lib/events";
import { jsonError } from "@/lib/format";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const event = await getPublishedEventBySlug(slug);
    if (!event) return jsonError("Event not found.", 404);
    const related = await getRelatedEvents(event.id, event.category);
    return Response.json(
      { event, related },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(error);
    return jsonError("Unable to load event.", 500);
  }
}
