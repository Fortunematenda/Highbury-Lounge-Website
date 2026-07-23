"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AdminLangTabs,
  buildTranslationDraft,
} from "@/app/admin/components/AdminLangTabs";
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

export function PackagesManager({ packages }: { packages: PackageRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [lang, setLang] = useState<AppLocale>("en");
  const [translations, setTranslations] = useState<ContentTranslations>({});
  const [capacity, setCapacity] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [features, setFeatures] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const current = translations[lang] ?? {};

  function openEdit(pkg: PackageRow) {
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
    setIsActive(pkg.isActive);
    setError("");
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

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    const en = translations.en ?? {};
    const englishName = (en.name || editing.name).trim();
    if (!englishName) {
      setError("English name is required.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch(`/api/admin/packages/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: englishName,
          description: en.description ?? "",
          capacity: Number(capacity),
          basePrice: basePrice === "" ? null : Number(basePrice),
          featuresJson: features || en.features || null,
          isActive,
          translationsJson: stringifyTranslations({
            ...translations,
            en: {
              name: englishName,
              description: en.description ?? "",
              features: features || en.features || "",
            },
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  const langHint = useMemo(() => {
    if (lang === "en") return "English fields are required and used as the default.";
    return "Optional translation. Leave blank to fall back to English.";
  }, [lang]);

  return (
    <>
      <section className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Capacity</th>
              <th>Base price</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {packages.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.capacity}</td>
                <td>{r.basePrice != null ? formatMoney(r.basePrice) : "—"}</td>
                <td>{r.isActive ? "Yes" : "No"}</td>
                <td>
                  <button
                    type="button"
                    className="admin-btn secondary"
                    onClick={() => openEdit(r)}
                  >
                    Edit translations
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editing ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            style={{ width: "min(560px, 100%)" }}
          >
            <h3>Edit package · {editing.slug}</h3>
            {error ? <div className="admin-error">{error}</div> : null}
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
                    Features (JSON array or plain text)
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
                  </div>
                  <label className="menu-check">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    Active
                  </label>
                </>
              ) : (
                <p className="admin-muted">
                  Capacity, pricing, and images stay shared across languages.
                </p>
              )}
              <div className="admin-actions">
                <button className="admin-btn" type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save package"}
                </button>
                <button
                  className="admin-btn secondary"
                  type="button"
                  onClick={() => setEditing(null)}
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
