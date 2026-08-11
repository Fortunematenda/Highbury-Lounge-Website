import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Building2, ClipboardList, ImageIcon, Landmark, ScrollText, Settings2 } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { writeAuditLog } from "@/lib/audit";
import { isSmtpConfigured } from "@/lib/notifications";
import { getSettingsMap, setSettings } from "@/lib/settings";
import {
  DetailFieldGrid,
  DetailPageShell,
  DetailSectionCard,
} from "@/app/admin/components/detail-page";
import { SiteMediaManager } from "./site-media-manager";

async function saveSettings(formData: FormData) {
  "use server";
  const user = await requireAdminPage(["administrator"]);
  const keys = [
    "business_name",
    "address",
    "phone",
    "whatsapp",
    "email",
    "currency",
    "check_in_time",
    "check_out_time",
    "pending_expiry_hours",
    "tax_rate",
    "service_fee_rate",
    "booking_terms",
    "cancellation_policy",
    "payment_instructions",
    "bank_name",
    "bank_branch",
    "bank_account_name",
    "bank_account_usd",
    "bank_account_zw",
    "reservations_email",
    "ticket_payment_instructions",
    "maintenance_mode",
  ];

  const values: Record<string, string> = {};
  for (const key of keys) {
    if (key === "maintenance_mode") {
      values[key] = formData.get("maintenance_mode") === "on" ? "true" : "false";
      continue;
    }
    const raw = formData.get(key);
    if (raw != null) values[key] = String(raw);
  }

  await setSettings(values);
  await writeAuditLog({
    adminUserId: user.id,
    action: "settings.update",
    entityType: "site_settings",
    details: { keys: Object.keys(values) },
  });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdminPage(["administrator"]);
  const settings = await getSettingsMap();
  const smtpOk = isSmtpConfigured();
  const { saved } = await searchParams;

  return (
    <DetailPageShell
      pageTitle="Settings"
      breadcrumbs={[{ label: "Settings" }]}
      title="Settings"
      description="Business details, booking rules, and website policies."
      backAction={{ label: "Back to dashboard", href: "/admin" }}
    >
      {saved === "1" ? (
        <div className="admin-success" role="status">
          Saved successfully.
        </div>
      ) : null}

      {!smtpOk ? (
        <div className="admin-warn">
          Email delivery is inactive until outgoing mail settings are configured.
        </div>
      ) : null}

      <form id="settings-form" className="detail-form-stack" action={saveSettings}>
        <DetailSectionCard title="Business" icon={Building2}>
          <DetailFieldGrid columns={2}>
            <label className="admin-form-field">
              <span>Business name</span>
              <input
                className="admin-input"
                name="business_name"
                defaultValue={settings.business_name ?? ""}
              />
            </label>
            <label className="admin-form-field">
              <span>Currency</span>
              <input
                className="admin-input"
                name="currency"
                defaultValue={settings.currency ?? "USD"}
              />
            </label>
            <label className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
              <span>Address</span>
              <input
                className="admin-input"
                name="address"
                defaultValue={settings.address ?? ""}
              />
            </label>
            <label className="admin-form-field">
              <span>Phone</span>
              <input
                className="admin-input"
                name="phone"
                defaultValue={settings.phone ?? ""}
              />
            </label>
            <label className="admin-form-field">
              <span>WhatsApp</span>
              <input
                className="admin-input"
                name="whatsapp"
                defaultValue={settings.whatsapp ?? ""}
              />
            </label>
            <label className="admin-form-field">
              <span>Email</span>
              <input
                className="admin-input"
                name="email"
                type="email"
                defaultValue={settings.email ?? ""}
              />
            </label>
          </DetailFieldGrid>
        </DetailSectionCard>

        <DetailSectionCard title="Booking rules" icon={ClipboardList}>
          <DetailFieldGrid columns={2}>
            <label className="admin-form-field">
              <span>Check-in time</span>
              <input
                className="admin-input"
                name="check_in_time"
                defaultValue={settings.check_in_time ?? "14:00"}
              />
            </label>
            <label className="admin-form-field">
              <span>Check-out time</span>
              <input
                className="admin-input"
                name="check_out_time"
                defaultValue={settings.check_out_time ?? "10:00"}
              />
            </label>
            <label className="admin-form-field">
              <span>Pending expiry (hours)</span>
              <input
                className="admin-input"
                name="pending_expiry_hours"
                type="number"
                defaultValue={settings.pending_expiry_hours ?? "24"}
              />
            </label>
            <label className="admin-form-field">
              <span>Tax rate (%)</span>
              <input
                className="admin-input"
                name="tax_rate"
                type="number"
                step="0.01"
                defaultValue={settings.tax_rate ?? "0"}
              />
            </label>
            <label className="admin-form-field">
              <span>Service fee rate (%)</span>
              <input
                className="admin-input"
                name="service_fee_rate"
                type="number"
                step="0.01"
                defaultValue={settings.service_fee_rate ?? "0"}
              />
            </label>
            <label
              className="admin-form-field"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                display: "flex",
                marginTop: 22,
              }}
            >
              <input
                type="checkbox"
                name="maintenance_mode"
                defaultChecked={settings.maintenance_mode === "true"}
              />
              <span>Maintenance mode</span>
            </label>
          </DetailFieldGrid>
        </DetailSectionCard>

        <DetailSectionCard title="Bank transfer (event tickets)" icon={Landmark}>
          <DetailFieldGrid columns={2}>
            <label className="admin-form-field">
              <span>Bank name</span>
              <input
                className="admin-input"
                name="bank_name"
                defaultValue={settings.bank_name ?? ""}
              />
            </label>
            <label className="admin-form-field">
              <span>Branch</span>
              <input
                className="admin-input"
                name="bank_branch"
                defaultValue={settings.bank_branch ?? ""}
              />
            </label>
            <label className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
              <span>Account name</span>
              <input
                className="admin-input"
                name="bank_account_name"
                defaultValue={settings.bank_account_name ?? ""}
              />
            </label>
            <label className="admin-form-field">
              <span>USD account number</span>
              <input
                className="admin-input"
                name="bank_account_usd"
                defaultValue={settings.bank_account_usd ?? ""}
              />
            </label>
            <label className="admin-form-field">
              <span>ZW account number</span>
              <input
                className="admin-input"
                name="bank_account_zw"
                defaultValue={settings.bank_account_zw ?? ""}
              />
            </label>
            <label className="admin-form-field">
              <span>Reservations email</span>
              <input
                className="admin-input"
                name="reservations_email"
                type="email"
                defaultValue={settings.reservations_email ?? ""}
              />
            </label>
            <label className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
              <span>Ticket payment instructions</span>
              <textarea
                className="admin-textarea admin-textarea-fixed"
                name="ticket_payment_instructions"
                rows={4}
                defaultValue={settings.ticket_payment_instructions ?? ""}
              />
            </label>
          </DetailFieldGrid>
        </DetailSectionCard>

        <DetailSectionCard title="Policies" icon={ScrollText}>
          <div className="detail-inline-form">
            <label className="admin-form-field">
              <span>Booking terms</span>
              <textarea
                className="admin-textarea admin-textarea-fixed"
                name="booking_terms"
                rows={5}
                defaultValue={settings.booking_terms ?? ""}
              />
            </label>
            <label className="admin-form-field">
              <span>Cancellation policy</span>
              <textarea
                className="admin-textarea admin-textarea-fixed"
                name="cancellation_policy"
                rows={5}
                defaultValue={settings.cancellation_policy ?? ""}
              />
            </label>
            <label className="admin-form-field">
              <span>Payment instructions</span>
              <textarea
                className="admin-textarea admin-textarea-fixed"
                name="payment_instructions"
                rows={5}
                defaultValue={settings.payment_instructions ?? ""}
              />
            </label>
          </div>
          <div className="detail-inline-actions">
            <button className="admin-btn" type="submit">
              <Settings2 size={16} aria-hidden />
              Save settings
            </button>
          </div>
        </DetailSectionCard>
      </form>

      <DetailSectionCard title="Site media" icon={ImageIcon}>
        <SiteMediaManager
          media={{
            hero_image: settings.hero_image ?? "/images/hero-venue.jpg",
            meet_image: settings.meet_image ?? "/images/conference.jpg",
            celebrate_image: settings.celebrate_image ?? "/images/events.jpg",
            dine_image_1: settings.dine_image_1 ?? "/images/dining.jpg",
            dine_image_2: settings.dine_image_2 ?? "/images/food.jpg",
          }}
        />
      </DetailSectionCard>
    </DetailPageShell>
  );
}
