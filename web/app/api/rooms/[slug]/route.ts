import { jsonError } from "@/lib/format";
import { getRoomBySlug } from "@/lib/rooms";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const room = await getRoomBySlug(slug);
    if (!room) return jsonError("Room not found.", 404);
    return Response.json(
      { room },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(error);
    return jsonError("Unable to load room.", 500);
  }
}
