"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  Eye,
  ImageIcon,
  Loader2,
  Ruler,
  Save,
  Settings2,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import {
  AdminLangTabs,
  buildTranslationDraft,
} from "@/app/admin/components/AdminLangTabs";
import { RoomImageGallery } from "@/app/admin/rooms/room-image-field";
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

type RoomImageRow = {
  id: number;
  url: string;
  altText: string | null;
  displayOrder: number;
};

export function EditRoomForm({
  room,
  images = [],
}: {
  room: Room;
  images?: RoomImageRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<string | null>(
    room.featuredImage,
  );
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
    setSuccess("");
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
          featuredImage,
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
      setSuccess("Saved successfully.");
      window.setTimeout(() => setSuccess(""), 3500);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function deactivate() {
    if (!window.confirm("Deactivate this room type?")) return;
    setDeactivating(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not deactivate");
        return;
      }
      router.push("/admin/rooms");
      router.refresh();
    } finally {
      setDeactivating(false);
    }
  }

  const langHint = useMemo(() => {
    if (lang === "en") {
      return "English fields are required and used as the default.";
    }
    return "Optional translation. Leave blank to fall back to English.";
  }, [lang]);

  return (
    <form className="room-detail-form" onSubmit={onSubmit}>
      {error ? (
        <div className="admin-error" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="admin-success" role="status">
          {success}
        </div>
      ) : null}

      <div className="room-detail-layout">
        <div className="room-detail-main">
          <section className="admin-card room-detail-section">
            <div className="room-detail-section-head">
              <div>
                <h2>
                  <Eye size={18} aria-hidden /> Content
                </h2>
                <p>Public listing copy shown on the website.</p>
              </div>
              <AdminLangTabs
                lang={lang}
                onChange={setLang}
                translations={translations}
              />
            </div>
            <p className="page-sub room-detail-hint">{langHint}</p>

            <div className="room-detail-fields">
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
                <input
                  className="admin-input"
                  name="slug"
                  defaultValue={room.slug}
                  required
                />
              </label>
              <label className="room-detail-span-2">
                Short description
                <input
                  className="admin-input"
                  value={current.shortDescription ?? ""}
                  onChange={(e) =>
                    updateField("shortDescription", e.target.value)
                  }
                  placeholder="One-line summary for cards and listings"
                />
              </label>
              <label className="room-detail-span-2">
                Description
                <textarea
                  className="admin-input"
                  rows={5}
                  value={current.description ?? ""}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Full room description for the detail page"
                />
              </label>
            </div>
          </section>

          <section className="admin-card room-detail-section">
            <div className="room-detail-section-head">
              <div>
                <h2>
                  <Wallet size={18} aria-hidden /> Pricing & inventory
                </h2>
                <p>Nightly rates and how many units can be sold.</p>
              </div>
            </div>
            <div className="room-detail-fields room-detail-fields-3">
              <label>
                Price / night *
                <input
                  className="admin-input"
                  name="pricePerNight"
                  type="number"
                  step="0.01"
                  min="0"
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
                  min="0"
                  defaultValue={room.promotionalPrice ?? ""}
                  placeholder="Optional"
                />
              </label>
              <label>
                Inventory *
                <input
                  className="admin-input"
                  name="inventoryCount"
                  type="number"
                  min="0"
                  defaultValue={room.inventoryCount}
                  required
                />
              </label>
            </div>
          </section>

          <section className="admin-card room-detail-section">
            <div className="room-detail-section-head">
              <div>
                <h2>
                  <Users size={18} aria-hidden /> Capacity & specs
                </h2>
                <p>Guest limits and physical room details.</p>
              </div>
            </div>
            <div className="room-detail-fields room-detail-fields-3">
              <label>
                Max adults
                <input
                  className="admin-input"
                  name="maxAdults"
                  type="number"
                  min="0"
                  defaultValue={room.maxAdults}
                />
              </label>
              <label>
                Max children
                <input
                  className="admin-input"
                  name="maxChildren"
                  type="number"
                  min="0"
                  defaultValue={room.maxChildren}
                />
              </label>
              <label>
                Max guests
                <input
                  className="admin-input"
                  name="maxGuests"
                  type="number"
                  min="0"
                  defaultValue={room.maxGuests}
                />
              </label>
              <label>
                <span className="room-field-label">
                  <BedDouble size={14} aria-hidden /> Bed type
                </span>
                <input
                  className="admin-input"
                  name="bedType"
                  defaultValue={room.bedType ?? ""}
                  placeholder="King, Twin, etc."
                />
              </label>
              <label>
                <span className="room-field-label">
                  <Ruler size={14} aria-hidden /> Room size
                </span>
                <input
                  className="admin-input"
                  name="roomSize"
                  defaultValue={room.roomSize ?? ""}
                  placeholder="e.g. 28 m²"
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
            </div>
          </section>

          <section className="admin-card room-detail-section">
            <div className="room-detail-section-head">
              <div>
                <h2>
                  <ImageIcon size={18} aria-hidden /> Gallery
                </h2>
                <p>Upload photos and choose the featured cover image.</p>
              </div>
            </div>
            <RoomImageGallery
              roomId={room.id}
              initialImages={images}
              featuredImage={featuredImage}
              onFeaturedChange={setFeaturedImage}
            />
          </section>
        </div>

        <aside className="room-detail-aside">
          <section className="admin-card room-detail-section room-detail-sticky">
            <div className="room-detail-section-head">
              <div>
                <h2>
                  <Settings2 size={18} aria-hidden /> Publishing
                </h2>
                <p>Visibility on the public website.</p>
              </div>
            </div>

            <div className="room-toggle-list">
              <label className="room-toggle">
                <span>
                  <strong>Active</strong>
                  <small>Available for booking when inventory allows</small>
                </span>
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={room.isActive}
                />
              </label>
              <label className="room-toggle">
                <span>
                  <strong>Featured</strong>
                  <small>Highlight this room on homepage listings</small>
                </span>
                <input
                  type="checkbox"
                  name="isFeatured"
                  defaultChecked={room.isFeatured}
                />
              </label>
            </div>

            <div className="room-detail-actions">
              <button
                className="admin-btn"
                type="submit"
                disabled={loading || deactivating}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" aria-hidden /> Saving…
                  </>
                ) : (
                  <>
                    <Save size={16} aria-hidden /> Save changes
                  </>
                )}
              </button>
              <Link className="admin-btn secondary" href="/admin/rooms">
                Back to rooms
              </Link>
              <button
                className="admin-btn ghost danger-text"
                type="button"
                disabled={loading || deactivating}
                onClick={() => void deactivate()}
              >
                {deactivating ? (
                  <>
                    <Loader2 size={16} className="spin" aria-hidden />{" "}
                    Deactivating…
                  </>
                ) : (
                  <>
                    <Trash2 size={16} aria-hidden /> Deactivate room
                  </>
                )}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
