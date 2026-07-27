"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BedDouble,
  Pencil,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { AdminRowActions } from "@/app/admin/components/AdminRowActions";
import {
  PmsEmptyState,
  PmsFab,
  PmsPageHeader,
  PmsStatusPill,
} from "@/app/admin/components/pms";
import { formatMoney } from "@/lib/format";

type RoomRow = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  pricePerNight: number;
  promotionalPrice: number | null;
  inventoryCount: number;
  maxGuests: number;
  bedType: string | null;
  featuredImage: string | null;
  isActive: boolean;
  isFeatured: boolean;
};

export function RoomsList({ rooms }: { rooms: RoomRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function removeRoom(room: RoomRow) {
    const ok = window.confirm(
      `Remove “${room.name}”? If it has bookings it will be deactivated instead.`,
    );
    if (!ok) return;
    setBusyId(room.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove room");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove room");
    } finally {
      setBusyId(null);
    }
  }

  function actionsFor(r: RoomRow) {
    return [
      { label: "Edit", href: `/admin/rooms/${r.id}` },
      {
        label: "Delete",
        danger: true,
        disabled: busyId === r.id,
        onClick: () => void removeRoom(r),
      },
    ];
  }

  if (rooms.length === 0) {
    return (
      <div className="pms-page">
        <PmsPageHeader
          eyebrow="Inventory"
          title="Rooms"
          subtitle="Room types guests can book on the website"
        />
        {error ? <div className="admin-error">{error}</div> : null}
        <PmsEmptyState
          icon={BedDouble}
          title="No rooms added yet"
          description="Create your first room type to start taking reservations."
          action={{ label: "Add first room", href: "/admin/rooms/new", icon: Plus }}
        />
      </div>
    );
  }

  return (
    <div className="pms-page">
      <PmsPageHeader
        eyebrow="Inventory"
        title="Rooms"
        subtitle={`${rooms.length} room type${rooms.length === 1 ? "" : "s"} in your property`}
        actions={
          <Link className="admin-btn" href="/admin/rooms/new">
            <Plus size={16} aria-hidden />
            Add room
          </Link>
        }
      />

      {error ? <div className="admin-error">{error}</div> : null}

      <div className="pms-room-grid">
        {rooms.map((room) => {
          const price = room.promotionalPrice ?? room.pricePerNight;
          const cover = room.featuredImage || "/images/deluxe-room.jpg";
          return (
            <article key={room.id} className="pms-room-card">
              <Link
                href={`/admin/rooms/${room.id}`}
                className="pms-room-card-media"
                aria-label={`Open ${room.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" />
                <div className="pms-room-card-badges">
                  <PmsStatusPill
                    label={room.isActive ? "Active" : "Inactive"}
                    tone={room.isActive ? "success" : "neutral"}
                  />
                  {room.isFeatured ? (
                    <PmsStatusPill label="Featured" tone="info" />
                  ) : null}
                </div>
              </Link>

              <div className="pms-room-card-body">
                <div className="pms-room-card-top">
                  <div>
                    <h2>
                      <Link href={`/admin/rooms/${room.id}`}>{room.name}</Link>
                    </h2>
                    {room.shortDescription ? (
                      <p className="pms-room-card-desc">{room.shortDescription}</p>
                    ) : (
                      <p className="pms-room-card-desc admin-muted">
                        {room.bedType || room.slug}
                      </p>
                    )}
                  </div>
                  <AdminRowActions
                    label={`Actions for ${room.name}`}
                    actions={actionsFor(room)}
                  />
                </div>

                {room.isFeatured ? (
                  <div className="pms-room-stars" aria-label="Featured room">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} fill="currentColor" aria-hidden />
                    ))}
                  </div>
                ) : null}

                <ul className="pms-room-stats">
                  <li>
                    <span>Rate</span>
                    <strong>{formatMoney(price)}</strong>
                    <small>/ night</small>
                  </li>
                  <li>
                    <Users size={14} aria-hidden />
                    <strong>{room.maxGuests}</strong>
                    <span>guests</span>
                  </li>
                  <li>
                    <BedDouble size={14} aria-hidden />
                    <strong>{room.inventoryCount}</strong>
                    <span>available</span>
                  </li>
                </ul>

                <div className="pms-room-card-actions">
                  <Link
                    className="admin-btn secondary"
                    href={`/admin/rooms/${room.id}`}
                  >
                    <Pencil size={15} aria-hidden />
                    Edit
                  </Link>
                  <Link
                    className="admin-btn ghost"
                    href={`/admin/calendar?room=${room.id}`}
                  >
                    Calendar
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <PmsFab href="/admin/rooms/new" label="Add room" icon={Plus} />
    </div>
  );
}
