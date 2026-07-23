import { AuthError, requireAdmin } from "@/lib/auth";
import { getSettingsMap, setSettings } from "@/lib/settings";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";

export async function GET() {
  try {
    await requireAdmin(["administrator"]);
    const settings = await getSettingsMap();
    return Response.json({ settings });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Failed to load settings.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(["administrator"]);
    const body = await request.json();
    const values =
      body.settings && typeof body.settings === "object"
        ? (body.settings as Record<string, string>)
        : (body as Record<string, string>);

    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key === "settings") continue;
      cleaned[key] = value == null ? "" : String(value);
    }

    await setSettings(cleaned);
    await writeAuditLog({
      adminUserId: user.id,
      action: "settings.update",
      entityType: "site_settings",
      details: { keys: Object.keys(cleaned) },
    });

    const settings = await getSettingsMap();
    return Response.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not save settings.", 500);
  }
}
