import { seedDatabase } from "@/lib/seed";
import { jsonError } from "@/lib/format";

export async function POST(request: Request) {
  const isDev = process.env.NODE_ENV === "development";
  const seedKey = process.env.SEED_KEY;
  const provided = request.headers.get("x-seed-key");

  if (!isDev) {
    if (!seedKey || provided !== seedKey) {
      return jsonError("Unauthorized seed request.", 401);
    }
  } else if (seedKey && provided && provided !== seedKey) {
    return jsonError("Invalid seed key.", 401);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await seedDatabase({
      adminEmail: body.adminEmail ? String(body.adminEmail) : undefined,
      adminPassword: body.adminPassword
        ? String(body.adminPassword)
        : undefined,
    });
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error(error);
    return jsonError(
      error instanceof Error ? error.message : "Seed failed.",
      500,
    );
  }
}
