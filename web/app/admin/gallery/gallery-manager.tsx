"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminRowActions } from "@/app/admin/components/AdminRowActions";
import { confirmDialog } from "@/app/admin/components/confirm-dialog";

type GalleryImage = {
  id: number;
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
  isActive: boolean;
};

export function GalleryManager({ images }: { images: GalleryImage[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("altText", file.name.replace(/\.[^.]+$/, ""));
        const res = await fetch("/api/admin/gallery", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
      }
      setSuccess("Created successfully.");
      window.setTimeout(() => setSuccess(""), 3200);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!(await confirmDialog("Remove this gallery image from the website?"))) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setSuccess("Saved successfully.");
      window.setTimeout(() => setSuccess(""), 3200);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(image: GalleryImage) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/gallery/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !image.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setSuccess("Saved successfully.");
      window.setTimeout(() => setSuccess(""), 3200);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Gallery</h1>
          <p className="page-sub">
            Images shown in the website gallery section. Add, hide, or remove anytime.
          </p>
        </div>
      </header>

      {error ? <div className="admin-error">{error}</div> : null}
      {success ? (
        <div className="admin-success" role="status">
          {success}
        </div>
      ) : null}

      <section className="admin-card">
        <label>
          Add images
          <input
            className="admin-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={(e) => {
              void onUpload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      <section className="admin-card">
        {images.length === 0 ? (
          <p className="admin-muted">No gallery images yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {images.map((image) => (
              <article
                key={image.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                  opacity: image.isActive ? 1 : 0.55,
                  position: "relative",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.imageUrl}
                  alt={image.altText || ""}
                  style={{
                    width: "100%",
                    height: 120,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: "rgba(255,255,255,0.92)",
                    borderRadius: 8,
                  }}
                >
                  <AdminRowActions
                    label={`Actions for gallery image ${image.id}`}
                    actions={[
                      {
                        label: image.isActive ? "Hide" : "Show",
                        disabled: busy,
                        onClick: () => void toggleActive(image),
                      },
                      {
                        label: "Delete",
                        danger: true,
                        disabled: busy,
                        onClick: () => void onDelete(image.id),
                      },
                    ]}
                  />
                </div>
                <div style={{ padding: 8 }}>
                  <small className="admin-muted">
                    {image.isActive ? "Visible" : "Hidden"}
                  </small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
