"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RoomImageGallery,
  uploadRoomImageFiles,
} from "@/app/admin/rooms/room-image-field";

export default function NewRoomPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
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
          setError(
            uploadErr instanceof Error
              ? `Room created, but image upload failed: ${uploadErr.message}`
              : "Room created, but image upload failed.",
          );
          router.push(`/admin/rooms/${data.room.id}`);
          router.refresh();
          return;
        }
      }

      setSuccess("Created successfully.");
      window.setTimeout(() => {
        router.push(`/admin/rooms/${data.room.id}`);
        router.refresh();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <h1>Add room type</h1>
      {error && <div className="admin-error">{error}</div>}
      {success ? (
        <div className="admin-success" role="status">
          {success}
        </div>
      ) : null}
      <form className="admin-form admin-card" onSubmit={onSubmit}>
        <label>
          Name
          <input className="admin-input" name="name" required />
        </label>
        <label>
          Slug (optional)
          <input className="admin-input" name="slug" />
        </label>
        <label>
          Short description
          <input className="admin-input" name="shortDescription" />
        </label>
        <label>
          Description
          <textarea className="admin-input" name="description" rows={4} />
        </label>
        <div className="admin-form-row">
          <label>
            Price / night
            <input className="admin-input" name="pricePerNight" type="number" step="0.01" required />
          </label>
          <label>
            Promo price
            <input className="admin-input" name="promotionalPrice" type="number" step="0.01" />
          </label>
          <label>
            Inventory
            <input className="admin-input" name="inventoryCount" type="number" defaultValue={1} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Max adults
            <input className="admin-input" name="maxAdults" type="number" defaultValue={2} />
          </label>
          <label>
            Max children
            <input className="admin-input" name="maxChildren" type="number" defaultValue={0} />
          </label>
          <label>
            Max guests
            <input className="admin-input" name="maxGuests" type="number" defaultValue={2} />
          </label>
        </div>
        <label>
          Bed type
          <input className="admin-input" name="bedType" />
        </label>
        <RoomImageGallery onPendingFilesChange={setPendingImages} />
        <label className="admin-check">
          <input type="checkbox" name="isActive" defaultChecked /> Active
        </label>
        <label className="admin-check">
          <input type="checkbox" name="isFeatured" /> Featured
        </label>
        <button className="admin-btn" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create room type"}
        </button>
      </form>
    </div>
  );
}
