"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  Eye,
  ImageIcon,
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
import { PmsTabs } from "@/app/admin/components/pms";
import {
  DetailDangerZone,
  DetailFieldGrid,
  DetailFieldSpan,
  DetailMetadataCard,
  DetailPageShell,
  DetailSectionCard,
  DetailStickyActionBar,
  StatusBadge,
} from "@/app/admin/components/detail-page";
import { RoomImageGallery } from "@/app/admin/rooms/room-image-field";
import {
  stringifyTranslations,
  type ContentTranslations,
} from "@/lib/i18n/content";
import type { AppLocale } from "@/lib/i18n/locales";
import { formatVenueDateTime } from "@/lib/timezone";
import { toast } from "sonner";

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
  createdAt?: string;
  updatedAt?: string;
};

type RoomImageRow = {
  id: number;
  url: string;
  altText: string | null;
  displayOrder: number;
};

const TABS = [
  { id: "overview", label: "Overview", icon: Eye },
  { id: "pricing", label: "Pricing", icon: Wallet },
  { id: "gallery", label: "Images", icon: ImageIcon },
  { id: "specs", label: "Details", icon: Users },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function EditRoomForm({
  room,
  images = [],
  coverUrl,
  summary,
}: {
  room: Room;
  images?: RoomImageRow[];
  coverUrl?: string | null;
  summary: {
    rateLabel: string;
    inventory: number;
    maxGuests: number;
    photoCount: number;
    createdAt?: string;
    updatedAt?: string;
    lastChangedBy?: string | null;
    lastChangedAt?: string | null;
    lastChangedEmail?: string | null;
  };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [dirty, setDirty] = useState(false);
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

  function markDirty() {
    setDirty(true);
  }

  function updateField(
    field: "name" | "description" | "shortDescription",
    value: string,
  ) {
    markDirty();
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
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    const en = translations.en ?? {};
    const englishName = (en.name || room.name).trim();
    if (!englishName) {
      toast.error("Enter a room name in English.");
      setTab("overview");
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
      if (!res.ok) throw new Error(data.error || "Could not save room");
      toast.success("Room saved");
      setDirty(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save room");
    } finally {
      setLoading(false);
    }
  }

  async function deactivate() {
    if (
      !window.confirm(
        `Deactivate “${room.name}”? Guests will no longer see it.`,
      )
    ) {
      return;
    }
    setDeactivating(true);
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not deactivate room");
        return;
      }
      toast.success("Room deactivated");
      setDirty(false);
      router.push("/admin/rooms");
      router.refresh();
    } finally {
      setDeactivating(false);
    }
  }

  const langHint = useMemo(() => {
    if (lang === "en") return "English is the primary language for this listing.";
    return "Optional. Empty fields fall back to English.";
  }, [lang]);

  return (
    <DetailPageShell
      pageTitle={`Edit ${room.name}`}
      breadcrumbs={[
        { label: "Rooms", href: "/admin/rooms" },
        { label: room.name },
      ]}
      title={room.name}
      description="Manage listing, rates, photos, and availability."
      status={
        <>
          <StatusBadge
            status={room.isActive ? "Active" : "Inactive"}
            tone={room.isActive ? "success" : "neutral"}
          />
          {room.isFeatured ? (
            <StatusBadge status="Featured" tone="info" />
          ) : null}
        </>
      }
      backAction={{ label: "Back to rooms", href: "/admin/rooms" }}
      sidebar={
        <>
          <section className="admin-card detail-section-card detail-preview-card pms-room-hero-card">
            <div className="detail-preview-media pms-room-hero-media">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="" />
              ) : (
                <div className="detail-preview-placeholder">No cover photo</div>
              )}
            </div>
            <div className="detail-preview-body">
              <strong>{room.name}</strong>
              <p>{summary.rateLabel}</p>
              <ul className="pms-meta-row pms-meta-row-stack">
                <li>
                  <BedDouble size={14} aria-hidden />
                  <strong>{summary.inventory}</strong>
                  <span>units</span>
                </li>
                <li>
                  <Users size={14} aria-hidden />
                  <strong>{summary.maxGuests}</strong>
                  <span>guests</span>
                </li>
                <li>
                  <ImageIcon size={14} aria-hidden />
                  <strong>{summary.photoCount}</strong>
                  <span>photos</span>
                </li>
              </ul>
            </div>
          </section>
          <DetailMetadataCard
            items={[
              {
                label: "Created",
                value: summary.createdAt
                  ? formatVenueDateTime(summary.createdAt, {
                      withSeconds: true,
                    })
                  : null,
              },
              {
                label: "Last updated",
                value: summary.updatedAt
                  ? formatVenueDateTime(summary.updatedAt, {
                      withSeconds: true,
                    })
                  : null,
              },
              {
                label: "Last changed by",
                value: summary.lastChangedBy ? (
                  <>
                    {summary.lastChangedBy}
                    {summary.lastChangedEmail ? (
                      <>
                        <br />
                        <span className="admin-muted">
                          {summary.lastChangedEmail}
                        </span>
                      </>
                    ) : null}
                    {summary.lastChangedAt ? (
                      <>
                        <br />
                        <span className="admin-muted">
                          {formatVenueDateTime(summary.lastChangedAt, {
                            withSeconds: true,
                          })}
                        </span>
                      </>
                    ) : null}
                  </>
                ) : null,
              },
              { label: "Page address", value: room.slug },
            ]}
          />
        </>
      }
    >
      <div className="pms-tabs-sticky">
        <PmsTabs
          tabs={[...TABS]}
          value={tab}
          onChange={(id) => setTab(id as TabId)}
        />
      </div>

      <form
        id="room-edit-form"
        className="detail-form-stack"
        onSubmit={onSubmit}
        onChange={markDirty}
      >
        {/* Keep all fields mounted so FormData always includes every input */}
        <div className={tab === "overview" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Listing content"
            description="What guests see on the public website."
            icon={Eye}
            headerAction={
              <AdminLangTabs
                lang={lang}
                onChange={setLang}
                translations={translations}
              />
            }
          >
            <p className="page-sub detail-inline-hint">{langHint}</p>
            <DetailFieldGrid columns={2}>
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
                Page address
                <input
                  className="admin-input"
                  name="slug"
                  defaultValue={room.slug}
                  required
                />
              </label>
              <DetailFieldSpan>
                <label>
                  Short description
                  <input
                    className="admin-input"
                    value={current.shortDescription ?? ""}
                    onChange={(e) =>
                      updateField("shortDescription", e.target.value)
                    }
                    placeholder="One-line summary for listings"
                  />
                </label>
              </DetailFieldSpan>
              <DetailFieldSpan>
                <label>
                  Description
                <textarea
                  className="admin-textarea admin-textarea-fixed"
                  rows={5}
                  value={current.description ?? ""}
                  onChange={(e) => updateField("description", e.target.value)}
                />
                </label>
              </DetailFieldSpan>
            </DetailFieldGrid>
          </DetailSectionCard>
        </div>

        <div className={tab === "pricing" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Pricing & inventory"
            description="Nightly rates and sellable units."
            icon={Wallet}
          >
            <DetailFieldGrid columns={3}>
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
            </DetailFieldGrid>
          </DetailSectionCard>
        </div>

        <div className={tab === "gallery" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Photo gallery"
            description="Upload, reorder, and set the cover image."
            icon={ImageIcon}
          >
            <RoomImageGallery
              roomId={room.id}
              initialImages={images}
              featuredImage={featuredImage}
              onFeaturedChange={(url) => {
                setFeaturedImage(url);
                markDirty();
              }}
            />
          </DetailSectionCard>
        </div>

        <div className={tab === "specs" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Capacity & specs"
            description="Guest limits and room details."
            icon={Users}
          >
            <DetailFieldGrid columns={3}>
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
                />
              </label>
              <label>
                Sort order
                <input
                  className="admin-input"
                  name="displayOrder"
                  type="number"
                  defaultValue={room.displayOrder}
                />
              </label>
            </DetailFieldGrid>
          </DetailSectionCard>
        </div>

        <div className={tab === "settings" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Publishing"
            description="Control website visibility."
            icon={Settings2}
          >
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
            <div className="detail-inline-actions">
              <button
                className="admin-btn"
                type="submit"
                disabled={loading || deactivating}
              >
                <Save size={16} aria-hidden />
                {loading ? "Saving…" : "Save changes"}
              </button>
            </div>
          </DetailSectionCard>

          <DetailDangerZone
            title="Deactivate room"
            description="Hide this room from the website. Existing bookings are not removed."
            action={{
              label: deactivating ? "Deactivating…" : "Deactivate room",
              icon: Trash2,
              loading: deactivating,
              disabled: loading || deactivating,
              onClick: () => void deactivate(),
            }}
          />
        </div>
      </form>

      <DetailStickyActionBar
        visible={dirty && !loading}
        primaryAction={{
          label: "Save changes",
          icon: Save,
          onClick: () =>
            (
              document.getElementById("room-edit-form") as HTMLFormElement
            )?.requestSubmit(),
          loading: loading,
        }}
        cancelAction={{
          label: "Back to rooms",
          href: "/admin/rooms",
          variant: "ghost",
        }}
      />
    </DetailPageShell>
  );
}
