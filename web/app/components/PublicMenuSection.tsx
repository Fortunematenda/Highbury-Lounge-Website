"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

type PublicMenuItem = {
  id: number;
  name: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  promotionalPrice: number | null;
  currency: string;
  imageUrl: string | null;
  allowPreOrder: boolean;
  isVegetarian?: boolean | null;
  isVegan?: boolean | null;
  isHalal?: boolean | null;
  isGlutenFree?: boolean | null;
  containsNuts?: boolean | null;
  isSpicy?: boolean | null;
  itemType: string;
  images?: Array<{ imageUrl: string; isFeatured?: boolean | null }>;
};

type PublicCategory = {
  id: number;
  name: string;
  items: PublicMenuItem[];
};

export type { PublicMenuItem };

type Props = {
  onPreview: (item: PublicMenuItem) => void;
  onOrder: (item?: PublicMenuItem) => void;
};

const FALLBACK_IMAGE = "/images/food.jpg";
const INITIAL_VISIBLE = 4;

export function PublicMenuSection({ onPreview, onOrder }: Props) {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/menu");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load menu");
        if (!cancelled) setCategories(data.categories ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load menu");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = categories.flatMap((c) =>
    c.items.map((item) => ({ ...item, categoryName: c.name })),
  );
  const visibleItems = showAll ? items : items.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(0, items.length - INITIAL_VISIBLE);

  return (
    <section className="section food-menu-section" aria-labelledby="food-menu-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">Available from our kitchen</p>
          <h2 id="food-menu-title">Explore the Highbury menu.</h2>
        </div>
        <p className="price-note">
          Freshly prepared for staying guests, conference delegates and visitors. Availability may vary during busy service periods.
        </p>
      </div>

      {loading && <p className="muted">Loading live menu…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <strong>Menu coming soon</strong>
          <p>Our kitchen team is updating today’s offerings.</p>
        </div>
      )}

      <div className="food-grid">
        {visibleItems.map((item) => (
          <article className="food-card" key={item.id}>
            <button
              className="food-image-button"
              onClick={() => onPreview(item)}
              aria-label={`Preview ${item.name}`}
              type="button"
            >
              <img src={item.imageUrl || FALLBACK_IMAGE} alt={item.name} />
              <span className="food-availability">Available today</span>
            </button>
            <div className="food-card-content">
              <span>{item.categoryName}</span>
              <div className="food-title-row">
                <h3>{item.name}</h3>
                <strong>
                  {item.promotionalPrice != null ? (
                    <>
                      <small style={{ textDecoration: "line-through", marginRight: 6 }}>
                        {formatMoney(item.price, item.currency)}
                      </small>
                      {formatMoney(item.promotionalPrice, item.currency)}
                    </>
                  ) : (
                    formatMoney(item.price, item.currency)
                  )}
                </strong>
              </div>
              <p>{item.shortDescription || item.description}</p>
              <div className="amenity-chips">
                {item.isVegetarian ? <span>✓ Vegetarian</span> : null}
                {item.isVegan ? <span>✓ Vegan</span> : null}
                {item.isHalal ? <span>✓ Halal</span> : null}
                {item.isGlutenFree ? <span>✓ Gluten-free</span> : null}
                {item.containsNuts ? <span>✓ Contains nuts</span> : null}
                {item.isSpicy ? <span>✓ Spicy</span> : null}
              </div>
              <div className="food-actions">
                <button type="button" onClick={() => onPreview(item)}>
                  View dish
                </button>
                {item.allowPreOrder ? (
                  <button
                    className="food-order-button"
                    type="button"
                    onClick={() => onOrder(item)}
                  >
                    Pre-order
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {hiddenCount > 0 ? (
        <div className="menu-show-more">
          <button
            type="button"
            className="button menu-more-button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
          >
            {showAll ? "Show less" : `Show more (+${hiddenCount})`}
          </button>
        </div>
      ) : null}

      <div className="menu-note">
        <div>
          <strong>Planning a conference or group meal?</strong>
          <p>
            Choose catering in the conference request form, or send a meal pre-order with the number of servings you need.
          </p>
        </div>
        <button className="button primary" type="button" onClick={() => onOrder()}>
          Start a food pre-order
        </button>
      </div>
    </section>
  );
}
