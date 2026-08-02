import { EventError, subscribeToEvents } from "@/lib/events";
import { jsonError } from "@/lib/format";

const recentSubmissions = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; source?: string };
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    const key = `${ip}:${(body.email || "anon").toLowerCase()}`;
    const now = Date.now();
    const last = recentSubmissions.get(key) ?? 0;
    if (now - last < 10_000) {
      return jsonError("Please wait a moment before trying again.", 429);
    }
    recentSubmissions.set(key, now);

    const result = await subscribeToEvents(
      body.email || "",
      body.source || "events_page",
    );
    return Response.json({
      ok: true,
      created: result.created,
      message: result.created
        ? "You’re subscribed. We’ll share upcoming Highbury events."
        : "You’re already on the list. We’ll keep you posted.",
    });
  } catch (error) {
    if (error instanceof EventError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Unable to subscribe right now.", 500);
  }
}
