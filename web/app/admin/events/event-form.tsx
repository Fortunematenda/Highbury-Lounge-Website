"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Megaphone,
  Plus,
  Save,
  Sparkles,
  Ticket,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { uploadEventImage } from "@/app/admin/events/event-image-upload";
import {
  AdminImageGalleryField,
  type AdminImageGalleryEndpoints,
} from "@/app/admin/components/AdminImageGalleryField";
import {
  AdminFormField,
  AdminSelect,
  AdminTextInput,
  AdminTextarea,
} from "@/app/admin/components/form-fields";
import { PmsTabs } from "@/app/admin/components/pms";
import {
  DetailFieldGrid,
  DetailFieldSpan,
  DetailMetadataCard,
  DetailPageShell,
  DetailSectionCard,
  DetailStickyActionBar,
  StatusBadge,
} from "@/app/admin/components/detail-page";
import {
  ACTION_TYPES,
  ENTRY_TYPES,
  EVENT_CATEGORIES,
  EVENT_STATUSES,
} from "@/lib/event-constants";

const BASE_TABS = [
  { id: "basic", label: "Basic", icon: Sparkles },
  { id: "schedule", label: "Schedule", icon: CalendarClock },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "pricing", label: "Pricing", icon: Wallet },
  { id: "reservation", label: "Reservation", icon: Ticket },
  { id: "guests", label: "Guests", icon: Users },
  { id: "publication", label: "Publication", icon: Megaphone },
] as const;

type TabId = (typeof BASE_TABS)[number]["id"];

export type ReservationRow = {
  id: number;
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  guestCount: number;
  status: string;
  createdAt: string;
};

const STATUS_TONE: Record<
  string,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  draft: "neutral",
  scheduled: "info",
  published: "success",
  postponed: "warning",
  cancelled: "danger",
  completed: "neutral",
};

type ProgrammeItem = { time: string; title: string; detail?: string };

export type EventRecord = {
  id: number;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  category: string;
  tags: string[];
  artistOrHost: string | null;
  venueName: string;
  venueAddress: string;
  startAt: string;
  endAt: string | null;
  timezone: string;
  coverImage: string | null;
  posterImage: string | null;
  gallery: string[];
  entryType: string;
  currency: string;
  price: number | null;
  capacity: number | null;
  trackCapacity: boolean;
  soldOutOverride: boolean;
  limitedSpaceThreshold: number | null;
  actionType: string;
  customActionLabel: string | null;
  externalBookingUrl: string | null;
  enableOnlineReservations: boolean;
  minGuests: number;
  maxGuestsPerReservation: number;
  reservationDeadline: string | null;
  requireApproval: boolean;
  programme: ProgrammeItem[];
  dressCode: string | null;
  ageNote: string | null;
  attendanceInfo: string | null;
  status: string;
  isFeatured: boolean;
  showAnnouncement: boolean;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  socialImage: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type FormState = {
  title: string;
  slug: string;
  category: string;
  artistOrHost: string;
  tagsText: string;
  shortDescription: string;
  description: string;
  venueName: string;
  venueAddress: string;
  dressCode: string;
  ageNote: string;
  attendanceInfo: string;
  startAt: string;
  endAt: string;
  timezone: string;
  entryType: string;
  currency: string;
  price: string;
  capacity: string;
  trackCapacity: boolean;
  soldOutOverride: boolean;
  limitedSpaceThreshold: string;
  actionType: string;
  customActionLabel: string;
  externalBookingUrl: string;
  enableOnlineReservations: boolean;
  minGuests: string;
  maxGuestsPerReservation: string;
  reservationDeadline: string;
  requireApproval: boolean;
  status: string;
  isFeatured: boolean;
  showAnnouncement: boolean;
  seoTitle: string;
  seoDescription: string;
};

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function fromDatetimeLocal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
}

function buildInitialState(initial?: EventRecord | null): FormState {
  return {
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    category: initial?.category ?? "Other",
    artistOrHost: initial?.artistOrHost ?? "",
    tagsText: initial?.tags?.join(", ") ?? "",
    shortDescription: initial?.shortDescription ?? "",
    description: initial?.description ?? "",
    venueName: initial?.venueName ?? "Highbury Lounge",
    venueAddress:
      initial?.venueAddress ?? "7504 Greenfield Cherries, Kadoma, Zimbabwe",
    dressCode: initial?.dressCode ?? "",
    ageNote: initial?.ageNote ?? "",
    attendanceInfo: initial?.attendanceInfo ?? "",
    startAt: toDatetimeLocal(initial?.startAt),
    endAt: toDatetimeLocal(initial?.endAt),
    timezone: initial?.timezone ?? "Africa/Harare",
    entryType: initial?.entryType ?? "contact",
    currency: initial?.currency ?? "USD",
    price: initial?.price != null ? String(initial.price) : "",
    capacity: initial?.capacity != null ? String(initial.capacity) : "",
    trackCapacity: initial?.trackCapacity ?? false,
    soldOutOverride: initial?.soldOutOverride ?? false,
    limitedSpaceThreshold:
      initial?.limitedSpaceThreshold != null
        ? String(initial.limitedSpaceThreshold)
        : "10",
    actionType: initial?.actionType ?? "reserve_table",
    customActionLabel: initial?.customActionLabel ?? "",
    externalBookingUrl: initial?.externalBookingUrl ?? "",
    enableOnlineReservations: initial?.enableOnlineReservations ?? true,
    minGuests: initial?.minGuests != null ? String(initial.minGuests) : "1",
    maxGuestsPerReservation:
      initial?.maxGuestsPerReservation != null
        ? String(initial.maxGuestsPerReservation)
        : "10",
    reservationDeadline: toDatetimeLocal(initial?.reservationDeadline),
    requireApproval: initial?.requireApproval ?? true,
    status: initial?.status ?? "draft",
    isFeatured: initial?.isFeatured ?? false,
    showAnnouncement: initial?.showAnnouncement ?? false,
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
  };
}


function singleImageEndpoints(
  eventId: number,
  kind: "cover" | "poster" | "social",
): AdminImageGalleryEndpoints {
  return {
    async upload(file) {
      const data = await uploadEventImage(eventId, file, kind);
      const url = data.imageUrl ?? null;
      return {
        featuredUrl: url,
        image: url ? { id: eventId, url } : undefined,
        images: url ? [{ id: eventId, url }] : [],
      };
    },
  };
}

function galleryEndpoints(eventId: number): AdminImageGalleryEndpoints {
  return {
    async upload(file) {
      const data = await uploadEventImage(eventId, file, "gallery");
      let gallery: string[] = [];
      try {
        gallery = data.event?.galleryJson
          ? (JSON.parse(data.event.galleryJson) as string[])
          : [];
      } catch {
        gallery = [];
      }
      return { images: gallery.map((url, index) => ({ id: index, url })) };
    },
  };
}

export function EventForm({
  mode,
  initial,
  reservedGuests = 0,
  reservationCount = 0,
  reservations,
  lastChange,
}: {
  mode: "create" | "edit";
  initial?: EventRecord | null;
  reservedGuests?: number;
  reservationCount?: number;
  reservations?: ReservationRow[];
  lastChange?: { label: string; email: string | null; at: string } | null;
}) {
  const router = useRouter();
  const allReservations = reservations ?? [];
  const TABS = BASE_TABS.filter(
    (t) => t.id !== "guests" || (mode === "edit" && allReservations.length > 0),
  );
  const [tab, setTab] = useState<TabId>("basic");
  const [form, setForm] = useState<FormState>(() => buildInitialState(initial));
  const [programme, setProgramme] = useState<ProgrammeItem[]>(
    initial?.programme ?? [],
  );
  const [coverImage, setCoverImage] = useState<string | null>(
    initial?.coverImage ?? null,
  );
  const [posterImage, setPosterImage] = useState<string | null>(
    initial?.posterImage ?? null,
  );
  const [socialImage, setSocialImage] = useState<string | null>(
    initial?.socialImage ?? null,
  );
  const [gallery, setGallery] = useState<string[]>(initial?.gallery ?? []);
  const [pendingCover, setPendingCover] = useState<File[]>([]);
  const [pendingPoster, setPendingPoster] = useState<File[]>([]);
  const [pendingSocial, setPendingSocial] = useState<File[]>([]);
  const [pendingGallery, setPendingGallery] = useState<File[]>([]);

  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dirty, setDirty] = useState(false);

  function markDirty() {
    setDirty(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    markDirty();
  }

  function updateProgramme(
    index: number,
    field: keyof ProgrammeItem,
    value: string,
  ) {
    setProgramme((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
    markDirty();
  }

  function addProgrammeItem() {
    setProgramme((prev) => [...prev, { time: "", title: "", detail: "" }]);
    markDirty();
  }

  function removeProgrammeItem(index: number) {
    setProgramme((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  }

  function buildPayload() {
    const tags = form.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const cleanedProgramme = programme
      .map((p) => ({ ...p, time: p.time.trim(), title: p.title.trim() }))
      .filter((p) => p.time && p.title);

    return {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      category: form.category,
      artistOrHost: form.artistOrHost.trim() || null,
      tags,
      shortDescription: form.shortDescription.trim() || null,
      description: form.description.trim() || null,
      venueName: form.venueName.trim() || undefined,
      venueAddress: form.venueAddress.trim() || undefined,
      dressCode: form.dressCode.trim() || null,
      ageNote: form.ageNote.trim() || null,
      attendanceInfo: form.attendanceInfo.trim() || null,
      startAt: fromDatetimeLocal(form.startAt),
      endAt: fromDatetimeLocal(form.endAt),
      timezone: form.timezone.trim() || undefined,
      entryType: form.entryType,
      currency: form.currency.trim() || "USD",
      price: form.price.trim() === "" ? null : Number(form.price),
      capacity: form.capacity.trim() === "" ? null : Number(form.capacity),
      trackCapacity: form.trackCapacity,
      soldOutOverride: form.soldOutOverride,
      limitedSpaceThreshold:
        form.limitedSpaceThreshold.trim() === ""
          ? null
          : Number(form.limitedSpaceThreshold),
      actionType: form.actionType,
      customActionLabel: form.customActionLabel.trim() || null,
      externalBookingUrl: form.externalBookingUrl.trim() || null,
      enableOnlineReservations: form.enableOnlineReservations,
      minGuests: Number(form.minGuests) || 1,
      maxGuestsPerReservation: Number(form.maxGuestsPerReservation) || 1,
      reservationDeadline: fromDatetimeLocal(form.reservationDeadline),
      requireApproval: form.requireApproval,
      programme: cleanedProgramme,
      status: form.status,
      isFeatured: form.isFeatured,
      showAnnouncement: form.showAnnouncement,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      coverImage,
      posterImage,
      gallery,
      socialImage,
    };
  }

  async function uploadPendingImages(eventId: number) {
    const jobs: Array<Promise<void>> = [];
    if (pendingCover[0]) {
      jobs.push(
        uploadEventImage(eventId, pendingCover[0], "cover").then((data) => {
          if (data.imageUrl) setCoverImage(data.imageUrl);
        }),
      );
    }
    if (pendingPoster[0]) {
      jobs.push(
        uploadEventImage(eventId, pendingPoster[0], "poster").then((data) => {
          if (data.imageUrl) setPosterImage(data.imageUrl);
        }),
      );
    }
    if (pendingSocial[0]) {
      jobs.push(
        uploadEventImage(eventId, pendingSocial[0], "social").then((data) => {
          if (data.imageUrl) setSocialImage(data.imageUrl);
        }),
      );
    }
    for (const file of pendingGallery) {
      jobs.push(
        uploadEventImage(eventId, file, "gallery").then((data) => {
          try {
            const parsed = data.event?.galleryJson
              ? (JSON.parse(data.event.galleryJson) as string[])
              : null;
            if (parsed) setGallery(parsed);
          } catch {
            /* ignore */
          }
        }),
      );
    }
    if (jobs.length) await Promise.all(jobs);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Enter an event title.");
      setTab("basic");
      return;
    }
    if (!form.startAt) {
      toast.error("Set a start date and time.");
      setTab("schedule");
      return;
    }
    setBusy(true);
    try {
      const payload = buildPayload();
      const res = await fetch(
        mode === "create" ? "/api/admin/events" : `/api/admin/events/${initial!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save event");

      const eventId = data.event?.id ?? initial?.id;
      if (eventId) {
        await uploadPendingImages(eventId);
      }
      setPendingCover([]);
      setPendingPoster([]);
      setPendingSocial([]);
      setPendingGallery([]);

      toast.success(mode === "create" ? "Event created" : "Event saved");
      setDirty(false);
      if (mode === "create" && eventId) {
        router.push(`/admin/events/${eventId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save event");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!initial) return;
    if (!window.confirm(`Delete “${initial.title}”? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/events/${initial.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete event");
      toast.success("Event deleted");
      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete event");
    } finally {
      setDeleting(false);
    }
  }

  const title = mode === "create" ? "Add event" : initial?.title || "Edit event";
  const showFullEntry = form.entryType === "fixed" || form.entryType === "from";
  const guestsTabLabel = allReservations.length > 0 ? `Guests (${allReservations.length})` : "Guests";
  const displayTabs = TABS.map((t) =>
    t.id === "guests" ? { ...t, label: guestsTabLabel } : t,
  );
  const tabIndex = TABS.findIndex((item) => item.id === tab);
  const canGoBack = tabIndex > 0;
  const canGoNext = tabIndex >= 0 && tabIndex < TABS.length - 1;
  const readyToPublish =
    form.title.trim().length > 0 &&
    Boolean(form.startAt) &&
    Boolean(coverImage || pendingCover[0]);

  function goToTab(direction: -1 | 1) {
    const next = TABS[tabIndex + direction];
    if (next) setTab(next.id);
  }

  return (
    <DetailPageShell
      pageTitle={title}
      breadcrumbs={[
        { label: "Events", href: "/admin/events" },
        { label: mode === "create" ? "Add event" : initial?.title || "Edit" },
      ]}
      title={title}
      description="Manage event details, media, pricing and reservations."
      status={
        mode === "edit" && initial ? (
          <>
            <StatusBadge
              status={form.status.charAt(0).toUpperCase() + form.status.slice(1)}
              tone={STATUS_TONE[form.status] ?? "neutral"}
            />
            {form.isFeatured ? <StatusBadge status="Featured" tone="info" /> : null}
          </>
        ) : undefined
      }
      backAction={{ label: "Back to events", href: "/admin/events" }}
      secondaryActions={
        mode === "edit" && initial
          ? [
              {
                label: deleting ? "Deleting…" : "Delete",
                icon: Trash2,
                variant: "danger" as const,
                loading: deleting,
                disabled: busy || deleting,
                onClick: () => void onDelete(),
              },
            ]
          : undefined
      }
      sidebar={
        mode === "edit" && initial ? (
          <>
            <section className="admin-card detail-section-card detail-preview-card">
              <div className="detail-preview-media">
                {coverImage || posterImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImage || posterImage || ""} alt="" />
                ) : (
                  <div className="detail-preview-placeholder">No cover photo</div>
                )}
              </div>
              <div className="detail-preview-body">
                <strong>{initial.title}</strong>
                <p>{form.venueName}</p>
              </div>
            </section>
            <DetailMetadataCard
              items={[
                { label: "Reservations", value: reservationCount },
                { label: "Guests reserved", value: reservedGuests },
                { label: "Page address", value: initial.slug },
                { label: "Created", value: initial.createdAt },
                { label: "Last updated", value: initial.updatedAt },
                {
                  label: "Last changed by",
                  value: lastChange ? (
                    <>
                      {lastChange.label}
                      {lastChange.email ? (
                        <>
                          <br />
                          <span className="admin-muted">{lastChange.email}</span>
                        </>
                      ) : null}
                      <br />
                      <span className="admin-muted">{lastChange.at}</span>
                    </>
                  ) : (
                    "No changes recorded yet"
                  ),
                },
              ]}
            />
          </>
        ) : undefined
      }
    >
      <div className="pms-tabs-sticky">
        <PmsTabs tabs={[...displayTabs]} value={tab} onChange={(id) => setTab(id as TabId)} />
      </div>

      <form
        id="event-form"
        className="detail-form-stack"
        noValidate
        onSubmit={onSubmit}
      >
        <div className={tab === "basic" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Event details"
            description="What guests see about this event."
            icon={Sparkles}
          >
            <DetailFieldGrid columns={2}>
              <AdminFormField label="Title" required>
                <AdminTextInput
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </AdminFormField>
              <AdminFormField
                label="Page address"
                hint="Leave blank to auto-generate from the title"
              >
                <AdminTextInput
                  value={form.slug}
                  onChange={(e) => update("slug", e.target.value)}
                  placeholder="auto-generated"
                />
              </AdminFormField>
              <AdminFormField label="Category" required>
                <AdminSelect
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </AdminSelect>
              </AdminFormField>
              <AdminFormField label="Artist / host">
                <AdminTextInput
                  value={form.artistOrHost}
                  onChange={(e) => update("artistOrHost", e.target.value)}
                />
              </AdminFormField>
              <DetailFieldSpan>
                <AdminFormField label="Tags" hint="Comma-separated, e.g. live, jazz, weekend">
                  <AdminTextInput
                    value={form.tagsText}
                    onChange={(e) => update("tagsText", e.target.value)}
                  />
                </AdminFormField>
              </DetailFieldSpan>
              <DetailFieldSpan>
                <AdminFormField label="Short description" hint="One-line summary for listings">
                  <AdminTextInput
                    value={form.shortDescription}
                    onChange={(e) => update("shortDescription", e.target.value)}
                  />
                </AdminFormField>
              </DetailFieldSpan>
              <DetailFieldSpan>
                <AdminFormField label="Description">
                  <AdminTextarea
                    rows={5}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                  />
                </AdminFormField>
              </DetailFieldSpan>
            </DetailFieldGrid>
          </DetailSectionCard>

          <DetailSectionCard
            title="Venue & guest notes"
            description="Optional details shown to guests."
          >
            <DetailFieldGrid columns={2}>
              <AdminFormField label="Venue name">
                <AdminTextInput
                  value={form.venueName}
                  onChange={(e) => update("venueName", e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Venue address">
                <AdminTextInput
                  value={form.venueAddress}
                  onChange={(e) => update("venueAddress", e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Dress code">
                <AdminTextInput
                  value={form.dressCode}
                  onChange={(e) => update("dressCode", e.target.value)}
                  placeholder="e.g. Smart casual"
                />
              </AdminFormField>
              <AdminFormField label="Age note">
                <AdminTextInput
                  value={form.ageNote}
                  onChange={(e) => update("ageNote", e.target.value)}
                  placeholder="e.g. 18+"
                />
              </AdminFormField>
              <DetailFieldSpan>
                <AdminFormField label="Attendance info">
                  <AdminTextarea
                    rows={3}
                    value={form.attendanceInfo}
                    onChange={(e) => update("attendanceInfo", e.target.value)}
                  />
                </AdminFormField>
              </DetailFieldSpan>
            </DetailFieldGrid>
          </DetailSectionCard>
        </div>

        <div className={tab === "schedule" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Date & time"
            description="When the event starts, ends, and in which timezone."
            icon={CalendarClock}
          >
            <DetailFieldGrid columns={3}>
              <AdminFormField label="Starts" required>
                <AdminTextInput
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => update("startAt", e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Ends">
                <AdminTextInput
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => update("endAt", e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Timezone">
                <AdminTextInput
                  value={form.timezone}
                  onChange={(e) => update("timezone", e.target.value)}
                />
              </AdminFormField>
            </DetailFieldGrid>
          </DetailSectionCard>

          <DetailSectionCard
            title="Programme"
            description="Optional running order shown on the event page."
            headerAction={
              <button
                type="button"
                className="admin-btn secondary"
                onClick={addProgrammeItem}
              >
                <Plus size={15} aria-hidden />
                Add item
              </button>
            }
          >
            {programme.length === 0 ? (
              <p className="admin-muted">No programme items yet.</p>
            ) : (
              <div className="detail-form-stack">
                {programme.map((item, index) => (
                  <div key={index} className="menu-fieldset">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong className="admin-muted">Item {index + 1}</strong>
                      <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => removeProgrammeItem(index)}
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </div>
                    <DetailFieldGrid columns={3}>
                      <AdminFormField label="Time">
                        <AdminTextInput
                          value={item.time}
                          placeholder="19:00"
                          onChange={(e) =>
                            updateProgramme(index, "time", e.target.value)
                          }
                        />
                      </AdminFormField>
                      <DetailFieldSpan span={2}>
                        <AdminFormField label="Title">
                          <AdminTextInput
                            value={item.title}
                            onChange={(e) =>
                              updateProgramme(index, "title", e.target.value)
                            }
                          />
                        </AdminFormField>
                      </DetailFieldSpan>
                      <DetailFieldSpan span={3}>
                        <AdminFormField label="Detail">
                          <AdminTextInput
                            value={item.detail ?? ""}
                            onChange={(e) =>
                              updateProgramme(index, "detail", e.target.value)
                            }
                          />
                        </AdminFormField>
                      </DetailFieldSpan>
                    </DetailFieldGrid>
                  </div>
                ))}
              </div>
            )}
          </DetailSectionCard>
        </div>

        <div className={tab === "media" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Cover image"
            description="Main image shown on the events list and hero."
            icon={ImageIcon}
          >
            <AdminImageGalleryField
              recordId={mode === "edit" ? initial?.id : null}
              featuredImage={coverImage}
              initialImages={coverImage ? [{ id: 0, url: coverImage }] : []}
              endpoints={
                mode === "edit" && initial
                  ? singleImageEndpoints(initial.id, "cover")
                  : undefined
              }
              single
              label="Cover photo"
              hint="Wide image used on listings and the hero banner."
              onFeaturedChange={setCoverImage}
              onPendingFilesChange={(files) => {
                setPendingCover(files);
                markDirty();
              }}
            />
          </DetailSectionCard>

          <DetailSectionCard
            title="Poster image"
            description="Portrait image, ideal for social sharing tiles."
            icon={ImageIcon}
          >
            <AdminImageGalleryField
              recordId={mode === "edit" ? initial?.id : null}
              featuredImage={posterImage}
              initialImages={posterImage ? [{ id: 0, url: posterImage }] : []}
              endpoints={
                mode === "edit" && initial
                  ? singleImageEndpoints(initial.id, "poster")
                  : undefined
              }
              single
              label="Poster photo"
              hint="Optional. Shown in poster-style layouts."
              onFeaturedChange={setPosterImage}
              onPendingFilesChange={(files) => {
                setPendingPoster(files);
                markDirty();
              }}
            />
          </DetailSectionCard>

          <DetailSectionCard
            title="Gallery"
            description="Extra photos shown on the event page."
            icon={ImageIcon}
          >
            <AdminImageGalleryField
              recordId={mode === "edit" ? initial?.id : null}
              initialImages={gallery.map((url, index) => ({ id: index, url }))}
              endpoints={
                mode === "edit" && initial ? galleryEndpoints(initial.id) : undefined
              }
              label="Gallery images"
              hint="Upload JPG, PNG or WebP. Images are added in upload order."
              onPendingFilesChange={(files) => {
                setPendingGallery(files);
                markDirty();
              }}
              onImagesChange={(next) => {
                setGallery(next.map((img) => img.url));
                markDirty();
              }}
            />
          </DetailSectionCard>
        </div>

        <div className={tab === "pricing" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Entry & pricing"
            description="How much guests pay to attend."
            icon={Wallet}
          >
            <DetailFieldGrid columns={3}>
              <AdminFormField label="Entry type" required>
                <AdminSelect
                  value={form.entryType}
                  onChange={(e) => update("entryType", e.target.value)}
                >
                  {ENTRY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </AdminSelect>
              </AdminFormField>
              {showFullEntry ? (
                <>
                  <AdminFormField label="Price">
                    <AdminTextInput
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => update("price", e.target.value)}
                    />
                  </AdminFormField>
                  <AdminFormField label="Currency">
                    <AdminTextInput
                      value={form.currency}
                      onChange={(e) => update("currency", e.target.value)}
                    />
                  </AdminFormField>
                </>
              ) : null}
            </DetailFieldGrid>
          </DetailSectionCard>

          <DetailSectionCard
            title="Capacity"
            description="Track available places and sold-out state."
          >
            <div className="room-toggle-list">
              <label className="room-toggle">
                <span>
                  <strong>Track capacity</strong>
                  <small>Count reservations against a maximum capacity</small>
                </span>
                <input
                  type="checkbox"
                  checked={form.trackCapacity}
                  onChange={(e) => update("trackCapacity", e.target.checked)}
                />
              </label>
              <label className="room-toggle">
                <span>
                  <strong>Force sold out</strong>
                  <small>Show as sold out regardless of capacity</small>
                </span>
                <input
                  type="checkbox"
                  checked={form.soldOutOverride}
                  onChange={(e) => update("soldOutOverride", e.target.checked)}
                />
              </label>
            </div>
            <DetailFieldGrid columns={2}>
              <AdminFormField label="Capacity">
                <AdminTextInput
                  type="number"
                  min="0"
                  disabled={!form.trackCapacity}
                  value={form.capacity}
                  onChange={(e) => update("capacity", e.target.value)}
                />
              </AdminFormField>
              <AdminFormField
                label="Limited space threshold"
                hint="Show “Limited space” when remaining places fall to this number"
              >
                <AdminTextInput
                  type="number"
                  min="0"
                  disabled={!form.trackCapacity}
                  value={form.limitedSpaceThreshold}
                  onChange={(e) => update("limitedSpaceThreshold", e.target.value)}
                />
              </AdminFormField>
            </DetailFieldGrid>
          </DetailSectionCard>
        </div>

        <div className={tab === "reservation" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Call to action"
            description="What guests do to attend this event."
            icon={Ticket}
          >
            <DetailFieldGrid columns={2}>
              <AdminFormField label="Action type" required>
                <AdminSelect
                  value={form.actionType}
                  onChange={(e) => update("actionType", e.target.value)}
                >
                  {ACTION_TYPES.map((a) => (
                    <option key={a} value={a}>
                      {a.replaceAll("_", " ")}
                    </option>
                  ))}
                </AdminSelect>
              </AdminFormField>
              <AdminFormField label="Custom button label" hint="Overrides the default label">
                <AdminTextInput
                  value={form.customActionLabel}
                  onChange={(e) => update("customActionLabel", e.target.value)}
                />
              </AdminFormField>
              {form.actionType === "external" ? (
                <DetailFieldSpan>
                  <AdminFormField label="External booking URL">
                    <AdminTextInput
                      type="url"
                      value={form.externalBookingUrl}
                      onChange={(e) =>
                        update("externalBookingUrl", e.target.value)
                      }
                      placeholder="https://…"
                    />
                  </AdminFormField>
                </DetailFieldSpan>
              ) : null}
            </DetailFieldGrid>
          </DetailSectionCard>

          <DetailSectionCard
            title="Online reservations"
            description="Guest reservation rules for this event."
          >
            <label className="room-toggle">
              <span>
                <strong>Enable online reservations</strong>
                <small>Allow guests to reserve directly on the website</small>
              </span>
              <input
                type="checkbox"
                checked={form.enableOnlineReservations}
                onChange={(e) =>
                  update("enableOnlineReservations", e.target.checked)
                }
              />
            </label>
            <label className="room-toggle">
              <span>
                <strong>Require approval</strong>
                <small>New reservations start as “Pending” instead of “Confirmed”</small>
              </span>
              <input
                type="checkbox"
                checked={form.requireApproval}
                onChange={(e) => update("requireApproval", e.target.checked)}
              />
            </label>
            <DetailFieldGrid columns={3}>
              <AdminFormField label="Minimum guests">
                <AdminTextInput
                  type="number"
                  min="1"
                  value={form.minGuests}
                  onChange={(e) => update("minGuests", e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Maximum guests / reservation">
                <AdminTextInput
                  type="number"
                  min="1"
                  value={form.maxGuestsPerReservation}
                  onChange={(e) =>
                    update("maxGuestsPerReservation", e.target.value)
                  }
                />
              </AdminFormField>
              <AdminFormField label="Reservation deadline">
                <AdminTextInput
                  type="datetime-local"
                  value={form.reservationDeadline}
                  onChange={(e) =>
                    update("reservationDeadline", e.target.value)
                  }
                />
              </AdminFormField>
            </DetailFieldGrid>
          </DetailSectionCard>
        </div>

        <div className={tab === "guests" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Guest reservations"
            description={
              allReservations.length === 0
                ? "No reservations for this event yet."
                : `${reservationCount} reservation(s) · ${reservedGuests} guest(s) reserved`
            }
            icon={Users}
          >
            {allReservations.length === 0 ? (
              <p className="admin-muted">Reservations will appear here once guests submit them.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Guest</th>
                      <th>Phone</th>
                      <th className="numeric">Guests</th>
                      <th>Status</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allReservations.map((r) => (
                      <tr
                        key={r.id}
                        className="admin-row"
                        onClick={() =>
                          router.push(`/admin/events/reservations/${r.id}`)
                        }
                      >
                        <td>{r.reference}</td>
                        <td>
                          <div>{r.fullName}</div>
                          <div className="admin-muted">{r.email}</div>
                        </td>
                        <td>{r.phone}</td>
                        <td className="numeric">{r.guestCount}</td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td>{r.createdAt.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailSectionCard>
        </div>

        <div className={tab === "publication" ? "pms-tab-panel" : "pms-tab-panel pms-tab-panel-hidden"}>
          <DetailSectionCard
            title="Publishing"
            description="Control website visibility."
            icon={Megaphone}
          >
            <DetailFieldGrid columns={2}>
              <AdminFormField label="Status" required>
                <AdminSelect
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  {EVENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </AdminSelect>
              </AdminFormField>
              {initial?.publishedAt ? (
                <AdminFormField label="Published at">
                  <AdminTextInput defaultValue={initial.publishedAt} disabled readOnly />
                </AdminFormField>
              ) : null}
            </DetailFieldGrid>
            <div className="room-toggle-list">
              <label className="room-toggle">
                <span>
                  <strong>Featured</strong>
                  <small>Highlight this event on the homepage</small>
                </span>
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => update("isFeatured", e.target.checked)}
                />
              </label>
              <label className="room-toggle">
                <span>
                  <strong>Show announcement banner</strong>
                  <small>Display this event in the site-wide announcement</small>
                </span>
                <input
                  type="checkbox"
                  checked={form.showAnnouncement}
                  onChange={(e) => update("showAnnouncement", e.target.checked)}
                />
              </label>
            </div>
          </DetailSectionCard>

          <DetailSectionCard
            title="SEO & sharing"
            description="Metadata used when this event is shared or found in search."
          >
            <DetailFieldGrid columns={2}>
              <AdminFormField label="SEO title">
                <AdminTextInput
                  value={form.seoTitle}
                  onChange={(e) => update("seoTitle", e.target.value)}
                />
              </AdminFormField>
              <DetailFieldSpan>
                <AdminFormField label="SEO description">
                  <AdminTextarea
                    rows={3}
                    value={form.seoDescription}
                    onChange={(e) => update("seoDescription", e.target.value)}
                  />
                </AdminFormField>
              </DetailFieldSpan>
            </DetailFieldGrid>
            <AdminImageGalleryField
              recordId={mode === "edit" ? initial?.id : null}
              featuredImage={socialImage}
              initialImages={socialImage ? [{ id: 0, url: socialImage }] : []}
              endpoints={
                mode === "edit" && initial
                  ? singleImageEndpoints(initial.id, "social")
                  : undefined
              }
              single
              label="Social share image"
              hint="Falls back to the cover or poster image when empty."
              onFeaturedChange={setSocialImage}
              onPendingFilesChange={(files) => {
                setPendingSocial(files);
                markDirty();
              }}
            />
          </DetailSectionCard>

          {readyToPublish ? (
            <div className="detail-inline-actions">
              <button className="admin-btn" type="submit" disabled={busy}>
                <Save size={16} aria-hidden />
                {busy
                  ? "Saving…"
                  : mode === "create"
                    ? "Create event"
                    : "Save changes"}
              </button>
            </div>
          ) : null}
        </div>

      </form>

      <DetailStickyActionBar
        tone="light"
        visible={!busy}
        cancelAction={
          canGoBack
            ? {
                label: "Back",
                icon: ChevronLeft,
                variant: "ghost",
                onClick: () => goToTab(-1),
              }
            : undefined
        }
        primaryAction={
          canGoNext
            ? {
                label: "Next",
                icon: ChevronRight,
                onClick: () => goToTab(1),
              }
            : readyToPublish
              ? {
                  label:
                    mode === "create"
                      ? busy
                        ? "Creating…"
                        : "Create event"
                      : busy
                        ? "Saving…"
                        : "Save changes",
                  icon: Save,
                  loading: busy,
                  disabled: busy || (mode === "edit" && !dirty),
                  onClick: () =>
                    (
                      document.getElementById("event-form") as HTMLFormElement
                    )?.requestSubmit(),
                }
              : null
        }
      />
    </DetailPageShell>
  );
}
