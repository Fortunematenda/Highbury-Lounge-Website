import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { menuCategories, menuItemImages, menuItems } from "@/db/schema";
import { jsonError } from "@/lib/format";

export async function GET() {
  try {
    const db = getDb();
    const categories = await db
      .select()
      .from(menuCategories)
      .where(
        and(
          isNull(menuCategories.archivedAt),
          eq(menuCategories.isActive, true),
        ),
      )
      .orderBy(asc(menuCategories.displayOrder));

    const items = await db
      .select()
      .from(menuItems)
      .where(
        and(
          isNull(menuItems.archivedAt),
          eq(menuItems.isActive, true),
          eq(menuItems.isAvailable, true),
          eq(menuItems.publicVisible, true),
        ),
      )
      .orderBy(asc(menuItems.displayOrder), asc(menuItems.name));

    const images = await db.select().from(menuItemImages);
    const imagesByItem = new Map<number, typeof images>();
    for (const image of images) {
      const list = imagesByItem.get(image.menuItemId) ?? [];
      list.push(image);
      imagesByItem.set(image.menuItemId, list);
    }

    const grouped = categories
      .map((category) => ({
        ...category,
        translationsJson: category.translationsJson,
        items: items
          .filter((item) => item.categoryId === category.id)
          .map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            shortDescription: item.shortDescription,
            description: item.description,
            translationsJson: item.translationsJson,
            price: item.price,
            promotionalPrice: item.promotionalPrice,
            currency: item.currency,
            priceUnit: item.priceUnit,
            itemType: item.itemType,
            imageUrl: item.imageUrl,
            allowPreOrder: item.allowPreOrder,
            isVegetarian: item.isVegetarian,
            isVegan: item.isVegan,
            isHalal: item.isHalal,
            isGlutenFree: item.isGlutenFree,
            containsNuts: item.containsNuts,
            isSpicy: item.isSpicy,
            isFeatured: item.isFeatured,
            images: (imagesByItem.get(item.id) ?? []).sort(
              (a, b) => a.displayOrder - b.displayOrder,
            ),
          })),
      }))
      .filter((category) => category.items.length > 0);

    return Response.json({ categories: grouped });
  } catch (error) {
    console.error(error);
    return jsonError("Unable to load menu.", 500);
  }
}
