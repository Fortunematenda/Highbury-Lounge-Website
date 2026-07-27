"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MEDIA_FIELDS = [
  { key: "hero_image", label: "Hero (homepage top)" },
  { key: "meet_image", label: "Meet / conference highlight" },
  { key: "celebrate_image", label: "Celebrate / events banner" },
  { key: "dine_image_1", label: "Dining image 1" },
  { key: "dine_image_2", label: "Dining image 2" },
] as const;

export function SiteMediaManager({
  media,
}: {
  media: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState(media);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function onUpload(key: string, file: File | undefined) {
    if (!file) return;
    setBusyKey(key);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("key", key);
      fd.append("file", file);
      fd.append("previousUrl", values[key] || "");
      const res = await fetch("/api/admin/site-media", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setValues((prev) => ({ ...prev, [key]: data.imageUrl }));
      setSuccess("Saved successfully.");
      window.setTimeout(() => setSuccess(""), 3200);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="admin-panel" style={{ marginTop: 24 }}>
      <h2>Homepage images</h2>
      <p className="page-sub">
        These replace the old fixed website photos. Upload new images anytime.
      </p>
      {error ? <div className="admin-error">{error}</div> : null}
      {success ? (
        <div className="admin-success" role="status">
          {success}
        </div>
      ) : null}
      <div className="admin-form" style={{ gap: 20 }}>
        {MEDIA_FIELDS.map((field) => (
          <label key={field.key}>
            {field.label}
            {values[field.key] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={values[field.key]}
                alt=""
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: 420,
                  maxHeight: 180,
                  objectFit: "cover",
                  borderRadius: 8,
                  margin: "8px 0",
                }}
              />
            ) : null}
            <input
              className="admin-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busyKey === field.key}
              onChange={(e) => {
                void onUpload(field.key, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {busyKey === field.key ? (
              <span className="admin-muted">Uploading…</span>
            ) : null}
          </label>
        ))}
      </div>
    </section>
  );
}
