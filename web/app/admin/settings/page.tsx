import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/admin-page";
import { writeAuditLog } from "@/lib/audit";
import { isSmtpConfigured } from "@/lib/notifications";
import { getSettingsMap, setSettings } from "@/lib/settings";

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
}

export default async function SettingsPage() {
  await requireAdminPage(["administrator"]);
  const settings = await getSettingsMap();
  const smtpOk = isSmtpConfigured();

  return (
    <>
      <h1>Settings</h1>
      <p className="page-sub">Business details, booking rules, and policies</p>

      {!smtpOk ? (
        <div className="admin-warn">
          Email delivery is inactive until SMTP environment variables are set.
        </div>
      ) : null}

      <form className="admin-form wide" action={saveSettings}>
        <div className="admin-panel">
          <h2>Business</h2>
          <div className="admin-form-row">
            <label>
              Business name
              <input
                className="admin-input"
                name="business_name"
                defaultValue={settings.business_name ?? ""}
              />
            </label>
            <label>
              Currency
              <input
                className="admin-input"
                name="currency"
                defaultValue={settings.currency ?? "USD"}
              />
            </label>
          </div>
          <label>
            Address
            <input
              className="admin-input"
              name="address"
              defaultValue={settings.address ?? ""}
            />
          </label>
          <div className="admin-form-row">
            <label>
              Phone
              <input
                className="admin-input"
                name="phone"
                defaultValue={settings.phone ?? ""}
              />
            </label>
            <label>
              WhatsApp
              <input
                className="admin-input"
                name="whatsapp"
                defaultValue={settings.whatsapp ?? ""}
              />
            </label>
          </div>
          <label>
            Email
            <input
              className="admin-input"
              name="email"
              type="email"
              defaultValue={settings.email ?? ""}
            />
          </label>
        </div>

        <div className="admin-panel">
          <h2>Booking rules</h2>
          <div className="admin-form-row">
            <label>
              Check-in time
              <input
                className="admin-input"
                name="check_in_time"
                defaultValue={settings.check_in_time ?? "14:00"}
              />
            </label>
            <label>
              Check-out time
              <input
                className="admin-input"
                name="check_out_time"
                defaultValue={settings.check_out_time ?? "10:00"}
              />
            </label>
          </div>
          <div className="admin-form-row">
            <label>
              Pending expiry (hours)
              <input
                className="admin-input"
                name="pending_expiry_hours"
                type="number"
                defaultValue={settings.pending_expiry_hours ?? "24"}
              />
            </label>
            <label>
              Tax rate (%)
              <input
                className="admin-input"
                name="tax_rate"
                type="number"
                step="0.01"
                defaultValue={settings.tax_rate ?? "0"}
              />
            </label>
          </div>
          <div className="admin-form-row">
            <label>
              Service fee rate (%)
              <input
                className="admin-input"
                name="service_fee_rate"
                type="number"
                step="0.01"
                defaultValue={settings.service_fee_rate ?? "0"}
              />
            </label>
            <label
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 22,
              }}
            >
              <input
                type="checkbox"
                name="maintenance_mode"
                defaultChecked={settings.maintenance_mode === "true"}
              />
              Maintenance mode
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Policies</h2>
          <label>
            Booking terms
            <textarea
              className="admin-textarea"
              name="booking_terms"
              rows={5}
              defaultValue={settings.booking_terms ?? ""}
            />
          </label>
          <label>
            Cancellation policy
            <textarea
              className="admin-textarea"
              name="cancellation_policy"
              rows={4}
              defaultValue={settings.cancellation_policy ?? ""}
            />
          </label>
          <label>
            Payment instructions
            <textarea
              className="admin-textarea"
              name="payment_instructions"
              rows={4}
              defaultValue={settings.payment_instructions ?? ""}
            />
          </label>
        </div>

        <button className="admin-btn" type="submit">
          Save settings
        </button>
      </form>
    </>
  );
}
