"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Save, Settings2, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  DetailFieldGrid,
  DetailFieldSpan,
  DetailPageShell,
  DetailSectionCard,
  DetailStickyActionBar,
} from "@/app/admin/components/detail-page";
import {
  RoomImageGallery,
  uploadRoomImageFiles,
} from "@/app/admin/rooms/room-image-field";

export default function NewRoomPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          featuredImage: null,
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
      if (!res.ok) throw new Error(data.error || "Could not create room");

      if (pendingImages.length > 0) {
        try {
          await uploadRoomImageFiles(data.room.id, pendingImages);
        } catch (uploadErr) {
          toast.error(
            uploadErr instanceof Error
              ? `Room created, but image upload failed: ${uploadErr.message}`
              : "Room created, but image upload failed.",
          );
          setDirty(false);
          router.push(`/admin/rooms/${data.room.id}`);
          router.refresh();
          return;
        }
      }

      toast.success("Room created");
      setDirty(false);
      router.push(`/admin/rooms/${data.room.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DetailPageShell
      pageTitle="Add room"
      breadcrumbs={[
        { label: "Rooms", href: "/admin/rooms" },
        { label: "Add room" },
      ]}
      title="Add room"
      description="Create a new room listing with pricing, capacity and photos."
      backAction={{ label: "Back to rooms", href: "/admin/rooms" }}
    >
      <form
        className="detail-form-stack"
        onSubmit={onSubmit}
        onChange={() => setDirty(true)}
      >
        <DetailSectionCard title="Basic information" icon={Users}>
          <DetailFieldGrid columns={2}>
            <label>
              Name *
              <input className="admin-input" name="name" required />
            </label>
            <label>
              Page address
              <input
                className="admin-input"
                name="slug"
                placeholder="Optional — generated from the name"
              />
            </label>
            <DetailFieldSpan>
              <label>
                Short description
                <input className="admin-input" name="shortDescription" />
              </label>
            </DetailFieldSpan>
            <DetailFieldSpan>
              <label>
                Description
                <textarea
                  className="admin-textarea admin-textarea-fixed"
                  name="description"
                  rows={4}
                />
              </label>
            </DetailFieldSpan>
          </DetailFieldGrid>
        </DetailSectionCard>

        <DetailSectionCard title="Pricing & inventory" icon={Wallet}>
          <DetailFieldGrid columns={3}>
            <label>
              Price / night *
              <input
                className="admin-input"
                name="pricePerNight"
                type="number"
                step="0.01"
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
              />
            </label>
            <label>
              Inventory *
              <input
                className="admin-input"
                name="inventoryCount"
                type="number"
                defaultValue={1}
                required
              />
            </label>
          </DetailFieldGrid>
        </DetailSectionCard>

        <DetailSectionCard title="Capacity" icon={Users}>
          <DetailFieldGrid columns={3}>
            <label>
              Max adults
              <input
                className="admin-input"
                name="maxAdults"
                type="number"
                defaultValue={2}
              />
            </label>
            <label>
              Max children
              <input
                className="admin-input"
                name="maxChildren"
                type="number"
                defaultValue={0}
              />
            </label>
            <label>
              Max guests
              <input
                className="admin-input"
                name="maxGuests"
                type="number"
                defaultValue={2}
              />
            </label>
            <label>
              Bed type
              <input className="admin-input" name="bedType" />
            </label>
          </DetailFieldGrid>
        </DetailSectionCard>

        <DetailSectionCard title="Gallery" icon={ImageIcon}>
          <RoomImageGallery
            onPendingFilesChange={(files) => {
              setPendingImages(files);
              setDirty(true);
            }}
          />
        </DetailSectionCard>

        <DetailSectionCard title="Publishing" icon={Settings2}>
          <div className="room-toggle-list">
            <label className="room-toggle">
              <span>
                <strong>Active</strong>
                <small>Show this room on the website</small>
              </span>
              <input type="checkbox" name="isActive" defaultChecked />
            </label>
            <label className="room-toggle">
              <span>
                <strong>Featured</strong>
                <small>Highlight on homepage listings</small>
              </span>
              <input type="checkbox" name="isFeatured" />
            </label>
          </div>
          <div className="detail-inline-actions">
            <button className="admin-btn" type="submit" disabled={loading}>
              <Save size={16} aria-hidden />
              {loading ? "Creating…" : "Create room"}
            </button>
          </div>
        </DetailSectionCard>
      </form>

      <DetailStickyActionBar
        visible={dirty && !loading}
        primaryAction={{
          label: "Create room",
          icon: Save,
          onClick: () =>
            (
              document.querySelector(
                ".detail-form-stack",
              ) as HTMLFormElement | null
            )?.requestSubmit(),
          loading: loading,
        }}
        cancelAction={{
          label: "Cancel",
          href: "/admin/rooms",
          variant: "ghost",
        }}
      />
    </DetailPageShell>
  );
}
