import { findAvailableRooms, validateStayDates } from "@/lib/availability";
import { jsonError } from "@/lib/format";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get("checkIn") ?? "";
    const checkOut = searchParams.get("checkOut") ?? "";
    const adults = Number(searchParams.get("adults") ?? "1");
    const children = Number(searchParams.get("children") ?? "0");
    const rooms = Number(searchParams.get("rooms") ?? "1");

    const dateError = validateStayDates(checkIn, checkOut);
    if (dateError) return jsonError(dateError, 400);
    if (!Number.isFinite(adults) || adults < 1) {
      return jsonError("At least one adult is required.", 400);
    }
    if (!Number.isFinite(children) || children < 0) {
      return jsonError("Children count is invalid.", 400);
    }
    if (!Number.isFinite(rooms) || rooms < 1) {
      return jsonError("Number of rooms must be at least 1.", 400);
    }

    const available = await findAvailableRooms({
      checkIn,
      checkOut,
      adults,
      children,
      roomsNeeded: rooms,
    });

    return Response.json({
      checkIn,
      checkOut,
      adults,
      children,
      roomsRequested: rooms,
      results: available,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to check availability.";
    return jsonError(message, 500);
  }
}
