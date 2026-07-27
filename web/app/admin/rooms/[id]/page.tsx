import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { roomImages, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatMoney } from "@/lib/format";
import { EditRoomForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["content_manager"]);
  const { id } = await params;
  const roomId = Number(id);
  const db = getDb();
  const [room] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, roomId))
    .limit(1);
  if (!room) notFound();

  const images = await db
    .select()
    .from(roomImages)
    .where(eq(roomImages.roomTypeId, roomId))
    .orderBy(asc(roomImages.displayOrder), asc(roomImages.id));

  const cover =
    room.featuredImage ||
    images.find((img) => img.url)?.url ||
    null;

  return (
    <div className="admin-page room-detail-page">
      <header className="room-detail-hero">
        <div className="room-detail-hero-media">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" />
          ) : (
            <div className="room-detail-hero-placeholder" aria-hidden>
              No cover image
            </div>
          )}
        </div>
        <div className="room-detail-hero-body">
          <div className="room-detail-hero-meta">
            <span className={`room-status-pill${room.isActive ? " is-active" : ""}`}>
              {room.isActive ? "Active" : "Inactive"}
            </span>
            {room.isFeatured ? (
              <span className="room-status-pill is-featured">Featured</span>
            ) : null}
            <span className="room-status-pill is-muted">/{room.slug}</span>
          </div>
          <h1>{room.name}</h1>
          <p className="page-sub">
            {room.shortDescription ||
              "Update pricing, capacity, gallery, and listing details for this room type."}
          </p>
          <dl className="room-detail-stats">
            <div>
              <dt>Rate</dt>
              <dd>
                {room.promotionalPrice != null && room.promotionalPrice > 0 ? (
                  <>
                    <span className="room-price-promo">
                      {formatMoney(room.promotionalPrice)}
                    </span>
                    <span className="room-price-was">
                      {formatMoney(room.pricePerNight)}
                    </span>
                  </>
                ) : (
                  formatMoney(room.pricePerNight)
                )}
                <span className="room-price-unit"> / night</span>
              </dd>
            </div>
            <div>
              <dt>Inventory</dt>
              <dd>{room.inventoryCount} units</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>Up to {room.maxGuests}</dd>
            </div>
            <div>
              <dt>Photos</dt>
              <dd>{images.length}</dd>
            </div>
          </dl>
        </div>
      </header>

      <EditRoomForm room={room} images={images} />
    </div>
  );
}
