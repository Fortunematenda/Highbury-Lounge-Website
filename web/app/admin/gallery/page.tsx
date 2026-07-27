import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { galleryImages } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { getSettingsMap } from "@/lib/settings";
import { GalleryManager } from "./gallery-manager";
import { SiteMediaManager } from "@/app/admin/settings/site-media-manager";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  await requireAdminPage(["content_manager"]);
  const db = getDb();
  const settings = await getSettingsMap();
  const images = await db
    .select()
    .from(galleryImages)
    .orderBy(asc(galleryImages.displayOrder), asc(galleryImages.id));

  return (
    <>
      <GalleryManager images={images} />
      <div className="admin-page" style={{ paddingTop: 0 }}>
        <SiteMediaManager
          media={{
            hero_image: settings.hero_image ?? "/images/hero-venue.jpg",
            meet_image: settings.meet_image ?? "/images/conference.jpg",
            celebrate_image: settings.celebrate_image ?? "/images/events.jpg",
            dine_image_1: settings.dine_image_1 ?? "/images/dining.jpg",
            dine_image_2: settings.dine_image_2 ?? "/images/food.jpg",
          }}
        />
      </div>
    </>
  );
}
