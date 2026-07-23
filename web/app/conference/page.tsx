"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { BackLink } from "@/app/components/BackLink";

type Package = {
  id: number;
  name: string;
  capacity: number;
  description: string | null;
};

export default function ConferencePage() {
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
      if (!res.ok) throw new Error(data.error || "Submission failed");
      router.push(
        `/conference/success?reference=${encodeURIComponent(data.enquiry.reference)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="booking-flow">
      <section className="booking-flow-panel">
        <BackLink href="/#meet" label="Back to venues" preferHistory={false} />
        <p className="eyebrow">Meet & celebrate</p>
        <h1>Conference enquiry</h1>
        <p>Tell us about your event and our team will prepare a quotation.</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <form className="guest-form" onSubmit={onSubmit}>
          <label>
            Venue / package
            <select
              value={form.packageId}
              onChange={(e) => setForm({ ...form, packageId: e.target.value })}
            >
              <option value="">Select a venue</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} (up to {pkg.capacity})
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Contact name
              <input
                required
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </label>
            <label>
              Company
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Phone
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
              WhatsApp
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </label>
            <label>
              Event type
              <select
                required
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              >
                <option value="">Select</option>
                <option>Conference</option>
                <option>Board meeting</option>
                <option>Workshop or training</option>
                <option>Corporate function</option>
                <option>Private event</option>
                <option>Other</option>
              </select>
            </label>
          </div>
          <div className="form-row three">
            <label>
              Preferred date
              <input
                type="date"
                min={today}
                required
                value={form.preferredDate}
                onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
              />
            </label>
            <label>
              Start time
              <input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </label>
            <label>
              End time
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
              Alternative date
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
              Attendees
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
            Seating arrangement
            <select
              value={form.seatingArrangement}
              onChange={(e) =>
                setForm({ ...form, seatingArrangement: e.target.value })
              }
            >
              <option>Theatre</option>
              <option>Boardroom</option>
              <option>Classroom</option>
              <option>U-shape</option>
              <option>Banquet</option>
            </select>
          </label>
          <div className="choice-grid">
            {(
              [
                ["cateringRequired", "Catering"],
                ["projectorRequired", "Projector"],
                ["soundSystemRequired", "Sound system"],
                ["internetRequired", "Internet"],
                ["accommodationRequired", "Accommodation"],
              ] as const
            ).map(([key, label]) => (
              <label className="check-choice" key={key}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
          <label>
            Catering notes
            <textarea
              rows={3}
              value={form.cateringNotes}
              onChange={(e) => setForm({ ...form, cateringNotes: e.target.value })}
            />
          </label>
          <label>
            Additional notes
            <textarea
              rows={4}
              value={form.additionalNotes}
              onChange={(e) =>
                setForm({ ...form, additionalNotes: e.target.value })
              }
            />
          </label>
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Submit enquiry"}
          </button>
        </form>
      </section>
    </main>
  );
}
