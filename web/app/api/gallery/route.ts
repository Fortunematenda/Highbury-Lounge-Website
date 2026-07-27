import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { galleryImages } from "@/db/schema";
import { jsonError } from "@/lib/format";

export async function GET() {
  try {
    const db = getDb();
    const images = await db
      .select({
        id: galleryImages.id,
        imageUrl: galleryImages.imageUrl,
        altText: galleryImages.altText,
        displayOrder: galleryImages.displayOrder,
      })
      .from(galleryImages)
      .where(and(eq(galleryImages.isActive, true)))
      .orderBy(asc(galleryImages.displayOrder), asc(galleryImages.id));

    return Response.json(
      { images },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(error);
    return jsonError("Unable to load gallery.", 500);
  }
}
