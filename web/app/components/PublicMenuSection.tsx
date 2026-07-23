"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import { pickTranslated } from "@/lib/i18n/content";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/locales";

type PublicMenuItem = {
  id: number;
  name: string;
  shortDescription: string | null;
  description: string | null;
  translationsJson?: string | null;
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
  translationsJson?: string | null;
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
  const { t, i18n } = useTranslation();
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
        if (!res.ok) throw new Error(data.error || t("validation.tryAgain"));
        if (!cancelled) setCategories(data.categories ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("validation.tryAgain"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locale = i18n.language as AppLocale;
  const items = categories.flatMap((c) => {
    const categoryLabel = pickTranslated(
      locale,
      { name: c.name, description: null, shortDescription: null },
      c.translationsJson,
    ).name;
    return c.items.map((item) => {
      const localized = pickTranslated(
        locale,
        {
          name: item.name,
          description: item.description,
          shortDescription: item.shortDescription,
        },
        item.translationsJson,
      );
      return {
        ...item,
        categoryName: categoryLabel,
        displayName: localized.name,
        displayDescription: localized.shortDescription || localized.description,
      };
    });
  });
  const visibleItems = showAll ? items : items.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(0, items.length - INITIAL_VISIBLE);

  return (
    <section className="section food-menu-section" aria-labelledby="food-menu-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t("menu.eyebrow")}</p>
          <h2 id="food-menu-title">{t("menu.title")}</h2>
        </div>
        <p className="price-note">{t("menu.note")}</p>
      </div>

      {loading && <p className="muted">{t("menu.loadingMenu")}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <strong>{t("menu.comingSoon")}</strong>
          <p>{t("menu.updatingOfferings")}</p>
        </div>
      )}

      <div className="food-grid">
        {visibleItems.map((item) => (
          <article className="food-card" key={item.id}>
            <button
              className="food-image-button"
              onClick={() => onPreview(item)}
              aria-label={t("menu.previewItem", { name: item.displayName })}
              type="button"
            >
              <img src={item.imageUrl || FALLBACK_IMAGE} alt={item.displayName} />
              <span className="food-availability">{t("menu.availableToday")}</span>
            </button>
            <div className="food-card-content">
              <span>{item.categoryName}</span>
              <div className="food-title-row">
                <h3>{item.displayName}</h3>
                <strong>
                  {item.promotionalPrice != null ? (
                    <>
                      <small style={{ textDecoration: "line-through", marginRight: 6 }}>
                        {formatMoney(item.price, item.currency, i18n.language)}
                      </small>
                      {formatMoney(item.promotionalPrice, item.currency, i18n.language)}
                    </>
                  ) : (
                    formatMoney(item.price, item.currency, i18n.language)
                  )}
                </strong>
              </div>
              <p>{item.displayDescription}</p>
              <div className="amenity-chips">
                {item.isVegetarian ? <span>✓ {t("menu.vegetarian")}</span> : null}
                {item.isVegan ? <span>✓ {t("menu.vegan")}</span> : null}
                {item.isHalal ? <span>✓ {t("menu.halal")}</span> : null}
                {item.isGlutenFree ? <span>✓ {t("menu.glutenFree")}</span> : null}
                {item.containsNuts ? <span>✓ {t("menu.containsNuts")}</span> : null}
                {item.isSpicy ? <span>✓ {t("menu.spicy")}</span> : null}
              </div>
              <div className="food-actions">
                <button type="button" onClick={() => onPreview(item)}>
                  {t("menu.viewDish")}
                </button>
                {item.allowPreOrder ? (
                  <button
                    className="food-order-button"
                    type="button"
                    onClick={() => onOrder(item)}
                  >
                    {t("menu.preOrder")}
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
            {showAll
              ? t("menu.showLess")
              : `${t("menu.showMore")} (+${hiddenCount})`}
          </button>
        </div>
      ) : null}

      <div className="menu-note">
        <div>
          <strong>{t("menu.planningGroupTitle")}</strong>
          <p>{t("menu.planningGroupBody")}</p>
        </div>
        <button className="button primary" type="button" onClick={() => onOrder()}>
          {t("menu.startFoodPreOrder")}
        </button>
      </div>
    </section>
  );
}
