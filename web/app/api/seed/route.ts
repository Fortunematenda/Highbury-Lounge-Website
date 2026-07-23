import { seedDatabase } from "@/lib/seed";
import { jsonError } from "@/lib/format";

export async function POST(request: Request) {
  try {
    const seedKey = process.env.SEED_KEY;
    const provided = request.headers.get("x-seed-key");
    const isDev = process.env.NODE_ENV !== "production";
    if (!isDev && (!seedKey || provided !== seedKey)) {
      return jsonError("Forbidden", 403);
    }

    const body = (await request.json().catch(() => ({}))) as {
      adminEmail?: string;
      adminPassword?: string;
    };

    const result = await seedDatabase(body);
    return Response.json({
      ok: true,
      message: "Database seeded.",
      adminEmail: result.adminEmail,
      adminPassword: result.adminPassword,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Seed failed";
    return jsonError(message, 500);
  }
}
