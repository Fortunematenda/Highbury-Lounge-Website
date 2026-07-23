"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { BackLink } from "@/app/components/BackLink";
import { pickTranslated } from "@/lib/i18n/content";
import { LanguageSelector } from "@/lib/i18n/LanguageSelector";
import { useTranslation } from "@/lib/i18n/I18nProvider";

type Package = {
  id: number;
  name: string;
  capacity: number;
  description: string | null;
  translationsJson?: string | null;
};

const EVENT_TYPE_OPTIONS = [
  { value: "Conference", labelKey: "conference.eventTypes.conference" },
  { value: "Board meeting", labelKey: "conference.eventTypes.board" },
  { value: "Workshop or training", labelKey: "conference.eventTypes.workshopTraining" },
  { value: "Corporate function", labelKey: "conference.eventTypes.corporate" },
  { value: "Private event", labelKey: "conference.eventTypes.private" },
  { value: "Other", labelKey: "conference.eventTypes.other" },
] as const;

const SEATING_OPTIONS = [
  { value: "Theatre", labelKey: "conference.seating.theatre" },
  { value: "Boardroom", labelKey: "conference.seating.boardroom" },
  { value: "Classroom", labelKey: "conference.seating.classroom" },
  { value: "U-shape", labelKey: "conference.seating.uShape" },
  { value: "Banquet", labelKey: "conference.seating.banquet" },
] as const;

const REQUIREMENT_OPTIONS = [
  ["cateringRequired", "conference.cateringRequired"],
  ["projectorRequired", "conference.projectorRequired"],
  ["soundSystemRequired", "conference.soundSystemRequired"],
  ["internetRequired", "conference.internetRequired"],
  ["accommodationRequired", "conference.accommodationRequired"],
] as const;

export default function ConferencePage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [packages, setPackages] = useState<Package[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    packageId: "",
    contactName: "",
    company: "",
    email: "",
    phone: "",
    whatsapp: "",
    eventType: "",
    preferredDate: "",
    alternativeDate: "",
    startTime: "",
    endTime: "",
    attendees: "20",
    seatingArrangement: "Theatre",
    cateringRequired: false,
    projectorRequired: false,
    soundSystemRequired: false,
    internetRequired: true,
    accommodationRequired: false,
    cateringNotes: "",
    additionalNotes: "",
  });

  useEffect(() => {
    void fetch("/api/conference")
      .then((r) => r.json())
      .then((data) => setPackages(data.packages ?? []))
      .catch(() => setPackages([]));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/conference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          packageId: form.packageId ? Number(form.packageId) : null,
          attendees: Number(form.attendees),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("validation.unableSubmit"));
      router.push(
        `/conference/success?reference=${encodeURIComponent(data.enquiry.reference)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("validation.unableSubmit"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="booking-flow">
      <section className="booking-flow-panel">
        <BackLink href="/#meet" label={t("conference.backToVenues")} preferHistory={false} />
        <LanguageSelector variant="panel" />
        <p className="eyebrow">{t("conference.eyebrow")}</p>
        <h1>{t("conference.title")}</h1>
        <p>{t("conference.intro")}</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <form className="guest-form" onSubmit={onSubmit}>
          <label>
            {t("conference.venuePackage")}
            <select
              value={form.packageId}
              onChange={(e) => setForm({ ...form, packageId: e.target.value })}
            >
              <option value="">{t("conference.selectVenue")}</option>
              {packages.map((pkg) => {
                const localized = pickTranslated(
                  i18n.language,
                  { name: pkg.name, description: pkg.description },
                  pkg.translationsJson,
                );
                return (
                  <option key={pkg.id} value={pkg.id}>
                    {localized.name} ({t("conference.upToCapacity", { count: pkg.capacity })})
                  </option>
                );
              })}
            </select>
          </label>
          <div className="form-row">
            <label>
              {t("conference.contactName")}
              <input
                required
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </label>
            <label>
              {t("conference.company")}
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              {t("booking.email")}
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              {t("booking.phone")}
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              {t("booking.whatsapp")}
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </label>
            <label>
              {t("conference.eventType")}
              <select
                required
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              >
                <option value="">{t("conference.select")}</option>
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row three">
            <label>
              {t("conference.preferredDate")}
              <input
                type="date"
                min={today}
                required
                value={form.preferredDate}
                onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
              />
            </label>
            <label>
              {t("conference.startTime")}
              <input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </label>
            <label>
              {t("conference.endTime")}
              <input
                type="time"
                required
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              {t("conference.alternativeDate")}
              <input
                type="date"
                min={today}
                value={form.alternativeDate}
                onChange={(e) =>
                  setForm({ ...form, alternativeDate: e.target.value })
                }
              />
            </label>
            <label>
              {t("conference.attendees")}
              <input
                type="number"
                min={1}
                required
                value={form.attendees}
                onChange={(e) => setForm({ ...form, attendees: e.target.value })}
              />
            </label>
          </div>
          <label>
            {t("conference.seatingArrangement")}
            <select
              value={form.seatingArrangement}
              onChange={(e) =>
                setForm({ ...form, seatingArrangement: e.target.value })
              }
            >
              {SEATING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <div className="choice-grid">
            {REQUIREMENT_OPTIONS.map(([key, labelKey]) => (
              <label className="check-choice" key={key}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                />
                {t(labelKey)}
              </label>
            ))}
          </div>
          <label>
            {t("conference.cateringNotes")}
            <textarea
              rows={3}
              value={form.cateringNotes}
              onChange={(e) => setForm({ ...form, cateringNotes: e.target.value })}
            />
          </label>
          <label>
            {t("conference.additionalNotes")}
            <textarea
              rows={4}
              value={form.additionalNotes}
              onChange={(e) =>
                setForm({ ...form, additionalNotes: e.target.value })
              }
            />
          </label>
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? t("conference.sending") : t("conference.submitEnquiry")}
          </button>
        </form>
      </section>
    </main>
  );
}
