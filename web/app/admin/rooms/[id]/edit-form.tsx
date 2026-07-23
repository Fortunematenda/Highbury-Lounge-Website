"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminLangTabs,
  buildTranslationDraft,
} from "@/app/admin/components/AdminLangTabs";
import {
  stringifyTranslations,
  type ContentTranslations,
} from "@/lib/i18n/content";
import type { AppLocale } from "@/lib/i18n/locales";

type Room = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  pricePerNight: number;
  promotionalPrice: number | null;
  inventoryCount: number;
  maxAdults: number;
  maxChildren: number;
  maxGuests: number;
  bedType: string | null;
  roomSize: string | null;
  featuredImage: string | null;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  translationsJson?: string | null;
};

export function EditRoomForm({ room }: { room: Room }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<AppLocale>("en");
  const [translations, setTranslations] = useState<ContentTranslations>(() =>
    buildTranslationDraft(
      {
        name: room.name,
        description: room.description ?? "",
        shortDescription: room.shortDescription ?? "",
      },
      room.translationsJson,
    ),
  );

  const current = translations[lang] ?? {};

  function updateField(
    field: "name" | "description" | "shortDescription",
    value: string,
  ) {
    setTranslations((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    const en = translations.en ?? {};
    const englishName = (en.name || room.name).trim();
    if (!englishName) {
      setError("English name is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          name: englishName,
          shortDescription: en.shortDescription ?? "",
          description: en.description ?? "",
          translationsJson: stringifyTranslations({
            ...translations,
            en: {
              name: englishName,
              shortDescription: en.shortDescription ?? "",
              description: en.description ?? "",
            },
          }),
          pricePerNight: Number(payload.pricePerNight),
          promotionalPrice: payload.promotionalPrice
            ? Number(payload.promotionalPrice)
            : null,
          inventoryCount: Number(payload.inventoryCount),
          maxAdults: Number(payload.maxAdults),
          maxChildren: Number(payload.maxChildren),
          maxGuests: Number(payload.maxGuests),
          displayOrder: Number(payload.displayOrder || 0),
          isActive: payload.isActive === "on",
          isFeatured: payload.isFeatured === "on",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function deactivate() {
    if (!window.confirm("Deactivate this room type?")) return;
    const res = await fetch(`/api/admin/rooms/${room.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not deactivate");
      return;
    }
    router.push("/admin/rooms");
    router.refresh();
  }

  const langHint = useMemo(() => {
    if (lang === "en") return "English fields are required and used as the default.";
    return "Optional translation. Leave blank to fall back to English.";
  }, [lang]);

  return (
    <>
      {error && <div className="admin-error">{error}</div>}
      <form className="admin-form admin-card" onSubmit={onSubmit}>
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
            value={current.name ?? ""}
            required={lang === "en"}
            onChange={(e) => updateField("name", e.target.value)}
          />
        </label>
        <label>
          Slug
          <input className="admin-input" name="slug" defaultValue={room.slug} required />
        </label>
        <label>
          Short description
          <input
            className="admin-input"
            value={current.shortDescription ?? ""}
            onChange={(e) => updateField("shortDescription", e.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            className="admin-input"
            rows={4}
            value={current.description ?? ""}
            onChange={(e) => updateField("description", e.target.value)}
          />
        </label>
        <div className="admin-form-row">
          <label>
            Price / night
            <input
              className="admin-input"
              name="pricePerNight"
              type="number"
              step="0.01"
              defaultValue={room.pricePerNight}
              required
            />
          </label>
          <label>
            Promo price
            <input
              className="admin-input"
              name="promotionalPrice"
              type="number"
              step="0.01"
              defaultValue={room.promotionalPrice ?? ""}
            />
          </label>
          <label>
            Inventory
            <input
              className="admin-input"
              name="inventoryCount"
              type="number"
              defaultValue={room.inventoryCount}
              required
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Max adults
            <input className="admin-input" name="maxAdults" type="number" defaultValue={room.maxAdults} />
          </label>
          <label>
            Max children
            <input className="admin-input" name="maxChildren" type="number" defaultValue={room.maxChildren} />
          </label>
          <label>
            Max guests
            <input className="admin-input" name="maxGuests" type="number" defaultValue={room.maxGuests} />
          </label>
        </div>
        <label>
          Bed type
          <input className="admin-input" name="bedType" defaultValue={room.bedType ?? ""} />
        </label>
        <label>
          Room size
          <input className="admin-input" name="roomSize" defaultValue={room.roomSize ?? ""} />
        </label>
        <label>
          Featured image URL
          <input
            className="admin-input"
            name="featuredImage"
            defaultValue={room.featuredImage ?? ""}
          />
        </label>
        <label>
          Display order
          <input
            className="admin-input"
            name="displayOrder"
            type="number"
            defaultValue={room.displayOrder}
          />
        </label>
        <label className="admin-check">
          <input type="checkbox" name="isActive" defaultChecked={room.isActive} /> Active
        </label>
        <label className="admin-check">
          <input type="checkbox" name="isFeatured" defaultChecked={room.isFeatured} /> Featured
        </label>
        <div className="admin-quick-actions">
          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </button>
          <button className="admin-btn secondary" type="button" onClick={() => void deactivate()}>
            Deactivate
          </button>
        </div>
      </form>
    </>
  );
}
