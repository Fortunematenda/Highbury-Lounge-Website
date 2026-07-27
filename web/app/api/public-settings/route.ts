import { getSettingsMap } from "@/lib/settings";
import { jsonError } from "@/lib/format";

const PUBLIC_KEYS = [
  "business_name",
  "address",
  "phone",
  "whatsapp",
  "email",
  "hero_image",
  "meet_image",
  "celebrate_image",
  "dine_image_1",
  "dine_image_2",
] as const;

export async function GET() {
  try {
    const map = await getSettingsMap();
    const settings: Record<string, string> = {};
    for (const key of PUBLIC_KEYS) {
      settings[key] = map[key] ?? "";
    }
    return Response.json(
      { settings },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(error);
    return jsonError("Unable to load settings.", 500);
  }
}
