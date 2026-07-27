"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AdminLangTabs,
  buildTranslationDraft,
} from "@/app/admin/components/AdminLangTabs";
import {
  AdminClickableRow,
  AdminRowActions,
} from "@/app/admin/components/AdminRowActions";
import {
  AdminMobileCard,
  AdminMobileMeta,
} from "@/app/admin/components/AdminMobileCard";
import { formatMoney } from "@/lib/format";
import {
  stringifyTranslations,
  type ContentTranslations,
} from "@/lib/i18n/content";
import type { AppLocale } from "@/lib/i18n/locales";

type PackageRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  capacity: number;
  basePrice: number | null;
  imageUrl: string | null;
  featuresJson: string | null;
  isActive: boolean;
  displayOrder: number;
  translationsJson?: string | null;
};

const EMPTY: PackageRow = {
  id: 0,
  name: "",
  slug: "",
  description: "",
  capacity: 20,
  basePrice: null,
  imageUrl: null,
  featuresJson: "",
  isActive: true,
  displayOrder: 0,
  translationsJson: null,
};

export function PackagesManager({ packages }: { packages: PackageRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [lang, setLang] = useState<AppLocale>("en");
  const [translations, setTranslations] = useState<ContentTranslations>({});
  const [capacity, setCapacity] = useState("20");
  const [basePrice, setBasePrice] = useState("");
  const [features, setFeatures] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const current = translations[lang] ?? {};
  const isCreate = creating;

  function openCreate() {
    setCreating(true);
    setEditing(EMPTY);
    setLang("en");
    setTranslations({ en: { name: "", description: "", features: "" } });
    setCapacity("20");
    setBasePrice("");
    setFeatures("");
    setImageUrl(null);
    setDisplayOrder("0");
    setIsActive(true);
    setError("");
    setSuccess("");
  }

  function openEdit(pkg: PackageRow) {
    setCreating(false);
    setEditing(pkg);
    setLang("en");
    setTranslations(
      buildTranslationDraft(
        {
          name: pkg.name,
          description: pkg.description ?? "",
          features: pkg.featuresJson ?? "",
        },
        pkg.translationsJson,
      ),
    );
    setCapacity(String(pkg.capacity));
    setBasePrice(pkg.basePrice != null ? String(pkg.basePrice) : "");
    setFeatures(pkg.featuresJson ?? "");
    setImageUrl(pkg.imageUrl);
    setDisplayOrder(String(pkg.displayOrder ?? 0));
    setIsActive(pkg.isActive);
    setError("");
    setSuccess("");
  }

  function closeModal() {
    setEditing(null);
    setCreating(false);
    setError("");
    setSuccess("");
  }

  function updateField(
    field: "name" | "description" | "features",
    value: string,
  ) {
    setTranslations((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }));
    if (lang === "en" && field === "features") setFeatures(value);
  }

  async function onUploadImage(file: File) {
    if (!editing || isCreate) {
      setError("Save the package first, then upload an image.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/packages/${editing.id}/image`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImageUrl(data.package?.imageUrl ?? null);
      setSuccess("Saved successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    setSuccess("");
    const en = translations.en ?? {};
    const englishName = (en.name || editing.name).trim();
    if (!englishName) {
      setError("English name is required.");
      setBusy(false);
      return;
    }

    const payload = {
      name: englishName,
      description: en.description ?? "",
      capacity: Number(capacity),
      basePrice: basePrice === "" ? null : Number(basePrice),
      featuresJson: features || en.features || null,
      imageUrl,
      isActive,
      displayOrder: Number(displayOrder || 0),
      translationsJson: stringifyTranslations({
        ...translations,
        en: {
          name: englishName,
          description: en.description ?? "",
          features: features || en.features || "",
        },
      }),
    };

    try {
      const res = await fetch(
        isCreate ? "/api/admin/packages" : `/api/admin/packages/${editing.id}`,
        {
          method: isCreate ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSuccess(isCreate ? "Created successfully." : "Saved successfully.");
      window.setTimeout(() => {
        closeModal();
        router.refresh();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(pkg: PackageRow) {
    if (!window.confirm(`Delete package “${pkg.name}”? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      if (editing?.id === pkg.id) closeModal();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  const langHint = useMemo(() => {
    if (lang === "en") return "English is the primary language for this package.";
    return "Optional translation. Leave blank to fall back to English.";
  }, [lang]);

  return (
    <>
      <div className="admin-quick-actions" style={{ marginBottom: 16 }}>
        <button type="button" className="admin-btn" onClick={openCreate}>
          Add package
        </button>
      </div>
      {error && !editing ? <div className="admin-error">{error}</div> : null}

      <section className="admin-card">
        <div className="admin-desktop-only">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Capacity</th>
                <th>Base price</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={6}>No packages yet. Add one to show venues on the website.</td>
                </tr>
              ) : (
                packages.map((r) => (
                  <AdminClickableRow key={r.id} onOpen={() => openEdit(r)}>
                    <td>
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.imageUrl}
                          alt=""
                          style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 4 }}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{r.name}</td>
                    <td>{r.capacity}</td>
                    <td>{r.basePrice != null ? formatMoney(r.basePrice) : "—"}</td>
                    <td>{r.isActive ? "Yes" : "No"}</td>
                    <td>
                      <AdminRowActions
                        label={`Actions for ${r.name}`}
                        actions={[
                          { label: "Edit", onClick: () => openEdit(r) },
                          {
                            label: "Delete",
                            danger: true,
                            disabled: busy,
                            onClick: () => void onDelete(r),
                          },
                        ]}
                      />
                    </td>
                  </AdminClickableRow>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-mobile-cards">
          {packages.length === 0 ? (
            <p className="admin-muted">No packages yet. Add one to show venues on the website.</p>
          ) : (
            packages.map((r) => (
              <AdminMobileCard
                key={r.id}
                title={r.name}
                subtitle={r.isActive ? "Active" : "Inactive"}
                onOpen={() => openEdit(r)}
                actions={[
                  { label: "Edit", onClick: () => openEdit(r) },
                  {
                    label: "Delete",
                    danger: true,
                    disabled: busy,
                    onClick: () => void onDelete(r),
                  },
                ]}
              >
                <AdminMobileMeta
                  items={[
                    { label: "Capacity", value: r.capacity },
                    {
                      label: "Base price",
                      value:
                        r.basePrice != null ? formatMoney(r.basePrice) : "—",
                    },
                  ]}
                />
              </AdminMobileCard>
            ))
          )}
        </div>
      </section>

      {editing ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            style={{ width: "min(560px, 100%)" }}
          >
            <h3>{isCreate ? "Add package" : `Edit ${editing.name}`}</h3>
            {error ? <div className="admin-error">{error}</div> : null}
            {success ? (
              <div className="admin-success" role="status">
                {success}
              </div>
            ) : null}
            <form className="admin-form" onSubmit={(e) => void onSave(e)}>
              <AdminLangTabs
                lang={lang}
                onChange={setLang}
                translations={translations}
              />
              <p className="page-sub">{langHint}</p>
              <label>
                Name {lang === "en" ? "*" : ""}
                <input
                  className="admin-input"
                  required={lang === "en"}
                  value={current.name ?? ""}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </label>
              <label>
                Description
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={current.description ?? ""}
                  onChange={(e) => updateField("description", e.target.value)}
                />
              </label>
              {lang === "en" ? (
                <>
                  <label>
                    Included features (one per line)
                    <textarea
                      className="admin-textarea"
                      rows={2}
                      value={features}
                      onChange={(e) => updateField("features", e.target.value)}
                    />
                  </label>
                  <div className="admin-form-row">
                    <label>
                      Capacity
                      <input
                        className="admin-input"
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Base price
                      <input
                        className="admin-input"
                        type="number"
                        step="0.01"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                      />
                    </label>
                    <label>
                      Sort order
                      <input
                        className="admin-input"
                        type="number"
                        value={displayOrder}
                        onChange={(e) => setDisplayOrder(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="menu-check">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    Active (visible on website)
                  </label>
                  {!isCreate ? (
                    <label>
                      Image
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt=""
                          style={{
                            display: "block",
                            width: "100%",
                            maxHeight: 160,
                            objectFit: "cover",
                            borderRadius: 6,
                            margin: "8px 0",
                          }}
                        />
                      ) : null}
                      <input
                        className="admin-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void onUploadImage(file);
                          e.target.value = "";
                        }}
                      />
                      {uploading ? <span className="admin-muted">Uploading…</span> : null}
                    </label>
                  ) : (
                    <p className="admin-muted">
                      Save the package first, then edit it to upload an image.
                    </p>
                  )}
                </>
              ) : (
                <p className="admin-muted">
                  Capacity, pricing, and images stay shared across languages.
                </p>
              )}
              <div className="admin-actions">
                <button className="admin-btn" type="submit" disabled={busy}>
                  {busy
                    ? isCreate
                      ? "Creating…"
                      : "Saving…"
                    : isCreate
                      ? "Create package"
                      : "Save package"}
                </button>
                <button
                  className="admin-btn secondary"
                  type="button"
                  onClick={closeModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
