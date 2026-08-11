import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";

const DEFAULTS: Record<string, string> = {
  business_name: "Highbury Lounge",
  address: "7504 Greenfield Cherries, Kadoma, Zimbabwe",
  phone: "+263 78 695 7068",
  whatsapp: "+263786957068",
  email: "test@higbury.com",
  currency: "USD",
  check_in_time: "14:00",
  check_out_time: "10:00",
  pending_expiry_hours: "24",
  tax_rate: "0",
  service_fee_rate: "0",
  booking_terms:
    "Reservations are held as Pending until confirmed by Highbury Lounge. Payment is arranged after confirmation. Cancellation policy applies as advised at confirmation.",
  cancellation_policy:
    "Please contact Highbury Lounge to discuss cancellations. Charges may apply depending on notice given.",
  maintenance_mode: "false",
  payment_instructions:
    "Payment options will be shared once your reservation is confirmed. Online card payment will be available in a future update.",
  bank_name: "CBZ Bank",
  bank_branch: "Kadoma Branch",
  bank_account_name: "Highbury Lounge Hotel and Conference Center",
  bank_account_usd: "61762017990021",
  bank_account_zw: "61762017990011",
  reservations_email: "reservationshighburylounge@gmail.com",
  ticket_payment_instructions:
    "Use your order reference as the deposit reference. After paying, keep your proof of payment. Tickets are issued once payment is verified by Highbury Lounge.",
  hero_image: "/images/hero-venue.jpg",
  meet_image: "/images/conference.jpg",
  celebrate_image: "/images/events.jpg",
  dine_image_1: "/images/dining.jpg",
  dine_image_2: "/images/food.jpg",
};

export async function getSettingsMap(): Promise<Record<string, string>> {
  const db = getDb();
  const rows = await db.select().from(siteSettings);
  const map = { ...DEFAULTS };
  for (const row of rows) {
    if (row.value != null) map[row.key] = row.value;
  }
  return map;
}

export async function getSetting(key: string): Promise<string> {
  const map = await getSettingsMap();
  return map[key] ?? DEFAULTS[key] ?? "";
}

export async function getSettingNumber(key: string, fallback = 0): Promise<number> {
  const value = await getSetting(key);
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function setSetting(key: string, value: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  if (existing) {
    await db
      .update(siteSettings)
      .set({ value, updatedAt: new Date().toISOString() })
      .where(eq(siteSettings.key, key));
  } else {
    await db.insert(siteSettings).values({ key, value });
  }
}

export async function setSettings(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    await setSetting(key, value);
  }
}

export { DEFAULTS as DEFAULT_SETTINGS };
