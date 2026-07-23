"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatMoney } from "@/lib/format";
import {
  FOOD_LIKE_TYPES,
  MENU_ITEM_TYPES,
  MENU_ITEM_TYPE_LABELS,
  PRICE_UNITS,
  PRICE_UNIT_LABELS,
  type MenuItemType,
} from "@/lib/menu-constants";
import { slugify } from "@/lib/slug";

type TabId = "overview" | "categories" | "items" | "products" | "archived";

type MenuImage = {
  id: number;
  menuItemId: number;
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
  isFeatured: boolean;
  originalFilename?: string;
};

type MenuCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  itemType: string;
  displayOrder: number;
  isActive: boolean;
  archivedAt: string | null;
};

type MenuItem = {
  id: number;
  name: string;
  slug: string | null;
  sku: string | null;
  categoryId: number;
  categoryName: string | null;
  itemType: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  promotionalPrice: number | null;
  currency: string;
  priceUnit: string;
  imageUrl: string | null;
  tags: string | null;
  quantityAvailable: number | null;
  preparationTimeMinutes: number | null;
  availableFrom: string | null;
  availableUntil: string | null;
  isActive: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  allowPreOrder: boolean;
  allowRoomBooking: boolean;
  allowConferenceBooking: boolean;
  isVegetarian: boolean | null;
  isVegan: boolean | null;
  isHalal: boolean | null;
  isGlutenFree: boolean | null;
  containsNuts: boolean | null;
  isSpicy: boolean | null;
  allergens: string | null;
  ingredients: string | null;
  servingSize: string | null;
  displayOrder: number;
  publicVisible: boolean;
  adminNotes: string | null;
  archivedAt: string | null;
  images?: MenuImage[];
};

type MenuStats = {
  totalItems: number;
  activeItems: number;
  unavailableItems: number;
  totalCategories: number;
  featuredItems: number;
  archivedItems: number;
};

type ItemFormState = {
  name: string;
  slug: string;
  itemType: MenuItemType;
  categoryId: string;
  shortDescription: string;
  description: string;
  sku: string;
  tags: string;
  price: string;
  promotionalPrice: string;
  currency: string;
  priceUnit: string;
  isActive: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  allowPreOrder: boolean;
  allowRoomBooking: boolean;
  allowConferenceBooking: boolean;
  quantityAvailable: string;
  preparationTimeMinutes: string;
  availableFrom: string;
  availableUntil: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  isGlutenFree: boolean;
  containsNuts: boolean;
  isSpicy: boolean;
  allergens: string;
  ingredients: string;
  servingSize: string;
  displayOrder: string;
  publicVisible: boolean;
  adminNotes: string;
};

type CategoryFormState = {
  name: string;
  slug: string;
  description: string;
  itemType: MenuItemType;
  displayOrder: string;
  isActive: boolean;
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
};

const PRODUCT_TYPES = MENU_ITEM_TYPES.filter(
  (t) => t !== "food" && t !== "drink",
);

const FOOD_DRINK_TYPES = new Set<string>(["food", "drink"]);

const emptyItemForm = (): ItemFormState => ({
  name: "",
  slug: "",
  itemType: "food",
  categoryId: "",
  shortDescription: "",
  description: "",
  sku: "",
  tags: "",
  price: "",
  promotionalPrice: "",
  currency: "USD",
  priceUnit: "per_item",
  isActive: true,
  isAvailable: true,
  isFeatured: false,
  allowPreOrder: true,
  allowRoomBooking: false,
  allowConferenceBooking: false,
  quantityAvailable: "",
  preparationTimeMinutes: "",
  availableFrom: "",
  availableUntil: "",
  isVegetarian: false,
  isVegan: false,
  isHalal: false,
  isGlutenFree: false,
  containsNuts: false,
  isSpicy: false,
  allergens: "",
  ingredients: "",
  servingSize: "",
  displayOrder: "0",
  publicVisible: true,
  adminNotes: "",
});

const emptyCategoryForm = (): CategoryFormState => ({
  name: "",
  slug: "",
  description: "",
  itemType: "food",
  displayOrder: "0",
  isActive: true,
});

function itemToForm(item: MenuItem): ItemFormState {
  return {
    name: item.name,
    slug: item.slug ?? "",
    itemType: (MENU_ITEM_TYPES.includes(item.itemType as MenuItemType)
      ? item.itemType
      : "food") as MenuItemType,
    categoryId: String(item.categoryId),
    shortDescription: item.shortDescription ?? "",
    description: item.description ?? "",
    sku: item.sku ?? "",
    tags: item.tags ?? "",
    price: String(item.price ?? ""),
    promotionalPrice:
      item.promotionalPrice != null ? String(item.promotionalPrice) : "",
    currency: item.currency || "USD",
    priceUnit: item.priceUnit || "per_item",
    isActive: Boolean(item.isActive),
    isAvailable: Boolean(item.isAvailable),
    isFeatured: Boolean(item.isFeatured),
    allowPreOrder: Boolean(item.allowPreOrder),
    allowRoomBooking: Boolean(item.allowRoomBooking),
    allowConferenceBooking: Boolean(item.allowConferenceBooking),
    quantityAvailable:
      item.quantityAvailable != null ? String(item.quantityAvailable) : "",
    preparationTimeMinutes:
      item.preparationTimeMinutes != null
        ? String(item.preparationTimeMinutes)
        : "",
    availableFrom: item.availableFrom ?? "",
    availableUntil: item.availableUntil ?? "",
    isVegetarian: Boolean(item.isVegetarian),
    isVegan: Boolean(item.isVegan),
    isHalal: Boolean(item.isHalal),
    isGlutenFree: Boolean(item.isGlutenFree),
    containsNuts: Boolean(item.containsNuts),
    isSpicy: Boolean(item.isSpicy),
    allergens: item.allergens ?? "",
    ingredients: item.ingredients ?? "",
    servingSize: item.servingSize ?? "",
    displayOrder: String(item.displayOrder ?? 0),
    publicVisible: Boolean(item.publicVisible),
    adminNotes: item.adminNotes ?? "",
  };
}

function categoryToForm(cat: MenuCategory): CategoryFormState {
  return {
    name: cat.name,
    slug: cat.slug,
    description: cat.description ?? "",
    itemType: (MENU_ITEM_TYPES.includes(cat.itemType as MenuItemType)
      ? cat.itemType
      : "food") as MenuItemType,
    displayOrder: String(cat.displayOrder ?? 0),
    isActive: Boolean(cat.isActive),
  };
}

function thumbUrl(item: MenuItem): string | null {
  const featured = item.images?.find((i) => i.isFeatured);
  return featured?.imageUrl || item.images?.[0]?.imageUrl || item.imageUrl || null;
}

function typeLabel(type: string) {
  return MENU_ITEM_TYPE_LABELS[type as MenuItemType] ?? type;
}

function priceUnitLabel(unit: string) {
  return PRICE_UNIT_LABELS[unit as keyof typeof PRICE_UNIT_LABELS] ?? unit;
}

async function readError(res: Response) {
  try {
    const data = await res.json();
    return (data.error as string) || res.statusText || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
}

export function MenusManager() {
  const [tab, setTab] = useState<TabId>("overview");
  const [stats, setStats] = useState<MenuStats | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemType, setItemType] = useState("");
  const [status, setStatus] = useState("");
  const [availability, setAvailability] = useState("");
  const [featured, setFeatured] = useState("");
  const [sort, setSort] = useState("displayOrder");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm);
  const [itemImages, setItemImages] = useState<MenuImage[]>([]);
  const [legacyImageUrl, setLegacyImageUrl] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<
    { key: string; file: File; previewUrl: string }[]
  >([]);
  const [imagesExpanded, setImagesExpanded] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(emptyCategoryForm);
  const [categorySlugManual, setCategorySlugManual] = useState(false);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [actionsOpenId, setActionsOpenId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3200);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/menu/stats");
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    setStats(data.stats);
  }, []);

  const loadCategories = useCallback(async (includeArchived = false) => {
    const url = includeArchived
      ? "/api/admin/menu/categories?archived=1"
      : "/api/admin/menu/categories";
    const res = await fetch(url);
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    setCategories(data.categories ?? []);
  }, []);

  const fetchItems = useCallback(
    async (nextPage: number, currentTab: TabId) => {
      const params = new URLSearchParams();

      if (currentTab === "overview") {
        params.set("sort", "updated");
        params.set("page", "1");
        params.set("pageSize", "8");
      } else {
        if (q) params.set("q", q);
        if (categoryId) params.set("categoryId", categoryId);
        if (status) params.set("status", status);
        if (availability) params.set("availability", availability);
        if (featured) params.set("featured", featured);
        if (sort) params.set("sort", sort);
        params.set("page", String(nextPage));
        params.set("pageSize", String(pageSize));

        if (currentTab === "archived") {
          params.set("archived", "1");
        }

        if (currentTab === "products") {
          if (itemType && !FOOD_DRINK_TYPES.has(itemType)) {
            params.set("itemType", itemType);
          }
        } else if (currentTab === "items") {
          if (itemType) params.set("itemType", itemType);
        } else if (itemType) {
          params.set("itemType", itemType);
        }

        if (
          (currentTab === "products" || currentTab === "items") &&
          !itemType
        ) {
          params.set("pageSize", "50");
        }
      }

      const res = await fetch(`/api/admin/menu/items?${params}`);
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      let list: MenuItem[] = data.items ?? [];

      if (currentTab === "products" && !itemType) {
        list = list.filter((i) => !FOOD_DRINK_TYPES.has(i.itemType));
      } else if (currentTab === "items" && !itemType) {
        list = list.filter((i) => FOOD_DRINK_TYPES.has(i.itemType));
      }

      setItems(list);
      setHasMore((data.items ?? []).length >= Number(params.get("pageSize")));
    },
    [
      availability,
      categoryId,
      featured,
      itemType,
      pageSize,
      q,
      sort,
      status,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        await Promise.all([
          loadStats(),
          loadCategories(tab === "archived"),
          tab === "categories"
            ? Promise.resolve()
            : fetchItems(page, tab),
        ]);
        if (cancelled) return;
        if (tab === "categories") setItems([]);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load menu data.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    fetchItems,
    loadCategories,
    loadStats,
    page,
    tab,
  ]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".menu-actions")) setActionsOpenId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const activeCategories = useMemo(
    () => categories.filter((c) => !c.archivedAt),
    [categories],
  );

  const categoriesForItemForm = useMemo(() => {
    return activeCategories.filter((c) => {
      if (!itemForm.itemType) return true;
      if (tab === "products") return !FOOD_DRINK_TYPES.has(c.itemType);
      return true;
    });
  }, [activeCategories, itemForm.itemType, tab]);

  function onSearchChange(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setQ(value.trim());
      setPage(1);
    }, 350);
  }

  function clearPendingImages() {
    setPendingImages((prev) => {
      for (const item of prev) URL.revokeObjectURL(item.previewUrl);
      return [];
    });
  }

  function closeItemModal() {
    clearPendingImages();
    setItemModalOpen(false);
  }

  function openCreateItem(preferredType?: MenuItemType) {
    setEditingItemId(null);
    setItemImages([]);
    setLegacyImageUrl(null);
    clearPendingImages();
    setImagesExpanded(false);
    setSlugManual(false);
    const form = emptyItemForm();
    if (preferredType) form.itemType = preferredType;
    else if (tab === "products") form.itemType = "accommodation_extra";
    const match = activeCategories.find((c) => c.itemType === form.itemType);
    form.categoryId = match ? String(match.id) : activeCategories[0]
      ? String(activeCategories[0].id)
      : "";
    setItemForm(form);
    setItemModalOpen(true);
  }

  async function openEditItem(item: MenuItem) {
    setError("");
    setBusy(true);
    setItemImages([]);
    setLegacyImageUrl(item.imageUrl ?? null);
    clearPendingImages();
    try {
      const res = await fetch(`/api/admin/menu/items/${item.id}`);
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      const full: MenuItem = data.item;
      const gallery = [...(full.images ?? [])].sort(
        (a, b) => a.displayOrder - b.displayOrder,
      );
      setEditingItemId(full.id);
      setItemForm(itemToForm(full));
      setItemImages(gallery);
      setLegacyImageUrl(full.imageUrl ?? item.imageUrl ?? null);
      setImagesExpanded(false);
      setSlugManual(Boolean(full.slug));
      setItemModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load item.");
    } finally {
      setBusy(false);
      setActionsOpenId(null);
    }
  }

  function openCreateCategory() {
    setEditingCategoryId(null);
    setCategorySlugManual(false);
    const form = emptyCategoryForm();
    if (tab === "products") form.itemType = "accommodation_extra";
    setCategoryForm(form);
    setCategoryModalOpen(true);
  }

  function openEditCategory(cat: MenuCategory) {
    setEditingCategoryId(cat.id);
    setCategoryForm(categoryToForm(cat));
    setCategorySlugManual(true);
    setCategoryModalOpen(true);
  }

  function updateItemField<K extends keyof ItemFormState>(
    key: K,
    value: ItemFormState[K],
  ) {
    setItemForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugManual) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  function updateCategoryField<K extends keyof CategoryFormState>(
    key: K,
    value: CategoryFormState[K],
  ) {
    setCategoryForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !categorySlugManual) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim() || slugify(categoryForm.name),
        description: categoryForm.description.trim() || null,
        itemType: categoryForm.itemType,
        displayOrder: Number(categoryForm.displayOrder || 0),
        isActive: categoryForm.isActive,
      };
      const res = await fetch(
        editingCategoryId
          ? `/api/admin/menu/categories/${editingCategoryId}`
          : "/api/admin/menu/categories",
        {
          method: editingCategoryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error(await readError(res));
      setCategoryModalOpen(false);
      flash(editingCategoryId ? "Category updated." : "Category created.");
      await loadCategories(tab === "archived");
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save category.");
    } finally {
      setBusy(false);
    }
  }

  async function reorderCategory(cat: MenuCategory, direction: -1 | 1) {
    const sorted = [...activeCategories].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    setBusy(true);
    setError("");
    try {
      const results = await Promise.all([
        fetch(`/api/admin/menu/categories/${cat.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reorder",
            displayOrder: swapWith.displayOrder,
          }),
        }),
        fetch(`/api/admin/menu/categories/${swapWith.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reorder",
            displayOrder: cat.displayOrder,
          }),
        }),
      ]);
      if (results.some((r) => !r.ok)) {
        throw new Error("Reorder failed.");
      }
      await loadCategories();
      flash("Category order updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: itemForm.name.trim(),
        slug: itemForm.slug.trim() || slugify(itemForm.name),
        itemType: itemForm.itemType,
        categoryId: Number(itemForm.categoryId),
        shortDescription: itemForm.shortDescription.trim() || null,
        description: itemForm.description.trim() || null,
        sku: itemForm.sku.trim() || null,
        tags: itemForm.tags.trim() || null,
        price: Number(itemForm.price),
        promotionalPrice: itemForm.promotionalPrice
          ? Number(itemForm.promotionalPrice)
          : null,
        currency: itemForm.currency.trim() || "USD",
        priceUnit: itemForm.priceUnit,
        isActive: itemForm.isActive,
        isAvailable: itemForm.isAvailable,
        isFeatured: itemForm.isFeatured,
        allowPreOrder: itemForm.allowPreOrder,
        allowRoomBooking: itemForm.allowRoomBooking,
        allowConferenceBooking: itemForm.allowConferenceBooking,
        quantityAvailable: itemForm.quantityAvailable
          ? Number(itemForm.quantityAvailable)
          : null,
        preparationTimeMinutes: itemForm.preparationTimeMinutes
          ? Number(itemForm.preparationTimeMinutes)
          : null,
        availableFrom: itemForm.availableFrom || null,
        availableUntil: itemForm.availableUntil || null,
        isVegetarian: itemForm.isVegetarian,
        isVegan: itemForm.isVegan,
        isHalal: itemForm.isHalal,
        isGlutenFree: itemForm.isGlutenFree,
        containsNuts: itemForm.containsNuts,
        isSpicy: itemForm.isSpicy,
        allergens: itemForm.allergens.trim() || null,
        ingredients: itemForm.ingredients.trim() || null,
        servingSize: itemForm.servingSize.trim() || null,
        displayOrder: Number(itemForm.displayOrder || 0),
        publicVisible: itemForm.publicVisible,
        adminNotes: itemForm.adminNotes.trim() || null,
      };

      const res = await fetch(
        editingItemId
          ? `/api/admin/menu/items/${editingItemId}`
          : "/api/admin/menu/items",
        {
          method: editingItemId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      const saved: MenuItem = data.item;

      if (!editingItemId) {
        setEditingItemId(saved.id);
        setItemForm(itemToForm(saved));
        if (pendingImages.length > 0) {
          setUploading(true);
          const uploaded: MenuImage[] = [];
          try {
            for (let i = 0; i < pendingImages.length; i += 1) {
              const pending = pendingImages[i];
              const fd = new FormData();
              fd.append("file", pending.file);
              if (i === 0) fd.append("featured", "1");
              const uploadRes = await fetch(
                `/api/admin/menu/items/${saved.id}/images`,
                { method: "POST", body: fd },
              );
              if (!uploadRes.ok) throw new Error(await readError(uploadRes));
              const uploadData = await uploadRes.json();
              uploaded.push(uploadData.image);
            }
            setItemImages(uploaded);
            clearPendingImages();
            flash(
              `Item created with ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}.`,
            );
          } finally {
            setUploading(false);
          }
        } else {
          setItemImages([]);
          flash("Item created.");
        }
        setItemModalOpen(false);
      } else {
        flash("Item updated.");
        setItemModalOpen(false);
      }
      await Promise.all([fetchItems(page, tab), loadStats()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save item.");
    } finally {
      setBusy(false);
    }
  }

  async function runItemAction(
    id: number,
    action:
      | "archive"
      | "restore"
      | "duplicate"
      | "toggle_available"
      | "toggle_active"
      | "toggle_featured",
  ) {
    setBusy(true);
    setError("");
    setActionsOpenId(null);
    try {
      const res = await fetch(`/api/admin/menu/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const labels: Record<string, string> = {
        archive: "Item archived.",
        restore: "Item restored.",
        duplicate: "Item duplicated.",
        toggle_available: "Availability updated.",
        toggle_active: "Status updated.",
        toggle_featured: "Featured flag updated.",
      };
      flash(labels[action] ?? "Updated.");
      setConfirm(null);
      await Promise.all([fetchItems(page, tab), loadStats()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/menu/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
      flash("Item permanently deleted.");
      await Promise.all([fetchItems(page, tab), loadStats()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function archiveCategory(id: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/menu/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      if (!res.ok) throw new Error(await readError(res));
      flash("Category archived.");
      await Promise.all([loadCategories(), loadStats()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive failed.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function restoreCategory(id: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/menu/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      if (!res.ok) throw new Error(await readError(res));
      flash("Category restored.");
      await Promise.all([loadCategories(true), loadStats()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(id: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/menu/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readError(res));
      flash("Category deleted.");
      await Promise.all([loadCategories(tab === "archived"), loadStats()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ]);
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  function stagePendingImages(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const next: { key: string; file: File; previewUrl: string }[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setError("Only JPG, PNG and WebP images are allowed.");
        continue;
      }
      if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
        setError("Each image must be under 5 MB.");
        continue;
      }
      next.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (next.length) {
      setPendingImages((prev) => [...prev, ...next]);
      flash(
        next.length === 1
          ? "Image ready. It will upload when you create the item."
          : `${next.length} images ready. They will upload when you create the item.`,
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingImage(key: string) {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    if (!editingItemId) {
      stagePendingImages(files);
      return;
    }
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
          throw new Error("Only JPG, PNG and WebP images are allowed.");
        }
        if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
          throw new Error("Each image must be under 5 MB.");
        }
        const fd = new FormData();
        fd.append("file", file);
        if (itemImages.length === 0) fd.append("featured", "1");
        const res = await fetch(
          `/api/admin/menu/items/${editingItemId}/images`,
          { method: "POST", body: fd },
        );
        if (!res.ok) throw new Error(await readError(res));
        const data = await res.json();
        setItemImages((prev) => [...prev, data.image]);
        setLegacyImageUrl(null);
      }
      flash("Image uploaded.");
      await fetchItems(page, tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function featureImage(imageId: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/menu/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feature" }),
      });
      if (!res.ok) throw new Error(await readError(res));
      setItemImages((prev) =>
        prev.map((img) => ({ ...img, isFeatured: img.id === imageId })),
      );
      flash("Featured image updated.");
      await fetchItems(page, tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set featured image.");
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(imageId: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/menu/images/${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readError(res));
      setItemImages((prev) => prev.filter((img) => img.id !== imageId));
      flash("Image removed.");
      await fetchItems(page, tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove image.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const showFoodFields = FOOD_LIKE_TYPES.has(itemForm.itemType);

  const typeOptions =
    tab === "products"
      ? PRODUCT_TYPES
      : tab === "items"
        ? (["food", "drink"] as const)
        : MENU_ITEM_TYPES;

  const overviewItems = items.slice(0, 8);

  return (
    <div className="admin-page menus-admin">
      <header className="admin-page-header">
        <div>
          <h1>Menus & Products</h1>
          <p className="page-sub">
            Manage food, drinks, services, extras and product pricing.
          </p>
        </div>
        <div className="admin-quick-actions">
          <button
            type="button"
            className="admin-btn secondary"
            onClick={() => openCreateCategory()}
          >
            Add Category
          </button>
          <button
            type="button"
            className="admin-btn"
            onClick={() => openCreateItem()}
          >
            Add Menu Item
          </button>
        </div>
      </header>

      {error ? <div className="admin-error">{error}</div> : null}
      {success ? <div className="admin-success">{success}</div> : null}

      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span>Total items</span>
          <strong>{stats?.totalItems ?? "—"}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Active</span>
          <strong>{stats?.activeItems ?? "—"}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Unavailable</span>
          <strong>{stats?.unavailableItems ?? "—"}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Categories</span>
          <strong>{stats?.totalCategories ?? "—"}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Featured</span>
          <strong>{stats?.featuredItems ?? "—"}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Archived</span>
          <strong>{stats?.archivedItems ?? "—"}</strong>
        </div>
      </div>

      <nav className="admin-tabs" aria-label="Menus sections">
        {(
          [
            ["overview", "Overview"],
            ["categories", "Menu Categories"],
            ["items", "Menu Items"],
            ["products", "Products and Extras"],
            ["archived", "Archived Items"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`admin-tab${tab === id ? " active" : ""}`}
            onClick={() => {
              setTab(id);
              setPage(1);
              setItemType("");
              setActionsOpenId(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab !== "categories" && tab !== "overview" ? (
        <div className="admin-filters">
          <label>
            Search
            <input
              className="admin-input"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Name, SKU, tags…"
            />
          </label>
          <label>
            Category
            <select
              className="admin-input"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {tab !== "archived" ? (
            <label>
              Type
              <select
                className="admin-input"
                value={itemType}
                onChange={(e) => {
                  setItemType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {MENU_ITEM_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Status
            <select
              className="admin-input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label>
            Availability
            <select
              className="admin-input"
              value={availability}
              onChange={(e) => {
                setAvailability(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </label>
          <label>
            Featured
            <select
              className="admin-input"
              value={featured}
              onChange={(e) => {
                setFeatured(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="1">Featured</option>
              <option value="0">Not featured</option>
            </select>
          </label>
          <label>
            Sort
            <select
              className="admin-input"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="displayOrder">Display order</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="updated">Recently updated</option>
              <option value="created">Recently created</option>
            </select>
          </label>
        </div>
      ) : null}

      {loading ? (
        <section className="admin-card">
          <p className="admin-muted">Loading menu data…</p>
        </section>
      ) : null}

      {!loading && tab === "overview" ? (
        <div className="admin-two-col">
          <section className="admin-card">
            <div className="admin-card-head">
              <h2>Categories</h2>
              <button
                type="button"
                className="admin-btn ghost"
                onClick={() => setTab("categories")}
              >
                Manage
              </button>
            </div>
            {activeCategories.length === 0 ? (
              <p className="admin-muted">No categories yet.</p>
            ) : (
              <ul className="admin-list">
                {activeCategories.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <strong>{c.name}</strong>
                    <span className="admin-muted">
                      {" "}
                      · {typeLabel(c.itemType)}
                      {!c.isActive ? " · inactive" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="admin-card">
            <div className="admin-card-head">
              <h2>Recent items</h2>
              <button
                type="button"
                className="admin-btn ghost"
                onClick={() => setTab("items")}
              >
                View all
              </button>
            </div>
            {overviewItems.length === 0 ? (
              <p className="admin-muted">No menu items yet.</p>
            ) : (
              <div className="menu-item-cards">
                {overviewItems.map((item) => (
                  <article key={item.id} className="menu-item-card">
                    <div className="menu-thumb">
                      {thumbUrl(item) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbUrl(item)!} alt="" />
                      ) : (
                        <span>No image</span>
                      )}
                    </div>
                    <div>
                      <strong>{item.name}</strong>
                      <p className="admin-muted">
                        {item.categoryName ?? "—"} · {typeLabel(item.itemType)}
                      </p>
                      <p>
                        {formatMoney(item.price, item.currency)}
                        {item.promotionalPrice != null ? (
                          <span className="menu-promo">
                            {" "}
                            / promo{" "}
                            {formatMoney(item.promotionalPrice, item.currency)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="admin-btn secondary"
                      onClick={() => void openEditItem(item)}
                    >
                      Edit
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {!loading && tab === "categories" ? (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Categories</h2>
            <button
              type="button"
              className="admin-btn"
              onClick={() => openCreateCategory()}
            >
              Add Category
            </button>
          </div>
          {activeCategories.length === 0 ? (
            <p className="admin-muted">No categories yet. Create one to start.</p>
          ) : (
            <>
              <div className="admin-table-wrap menu-desktop-only">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCategories.map((c, idx) => (
                      <tr key={c.id}>
                        <td>
                          <div className="admin-actions">
                            <button
                              type="button"
                              className="admin-btn ghost"
                              disabled={busy || idx === 0}
                              onClick={() => void reorderCategory(c, -1)}
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="admin-btn ghost"
                              disabled={
                                busy || idx === activeCategories.length - 1
                              }
                              onClick={() => void reorderCategory(c, 1)}
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                            <span className="admin-muted">{c.displayOrder}</span>
                          </div>
                        </td>
                        <td>
                          <strong>{c.name}</strong>
                          {c.description ? (
                            <div className="admin-muted">{c.description}</div>
                          ) : null}
                        </td>
                        <td>{typeLabel(c.itemType)}</td>
                        <td>
                          <span
                            className={`admin-badge ${c.isActive ? "ok" : "off"}`}
                          >
                            {c.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button
                              type="button"
                              className="admin-btn secondary"
                              onClick={() => openEditCategory(c)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-btn ghost"
                              onClick={() =>
                                setConfirm({
                                  title: "Archive category",
                                  message: `Archive “${c.name}”? It will be hidden from active lists.`,
                                  confirmLabel: "Archive",
                                  onConfirm: () => archiveCategory(c.id),
                                })
                              }
                            >
                              Archive
                            </button>
                            <button
                              type="button"
                              className="admin-btn danger"
                              onClick={() =>
                                setConfirm({
                                  title: "Delete category",
                                  message: `Permanently delete “${c.name}”? This only works if it has no items.`,
                                  confirmLabel: "Delete",
                                  danger: true,
                                  onConfirm: () => deleteCategory(c.id),
                                })
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="menu-mobile-cards">
                {activeCategories.map((c, idx) => (
                  <article key={c.id} className="menu-item-card">
                    <div>
                      <strong>{c.name}</strong>
                      <p className="admin-muted">
                        {typeLabel(c.itemType)} · order {c.displayOrder}
                      </p>
                      <span
                        className={`admin-badge ${c.isActive ? "ok" : "off"}`}
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-btn ghost"
                        disabled={busy || idx === 0}
                        onClick={() => void reorderCategory(c, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-btn ghost"
                        disabled={busy || idx === activeCategories.length - 1}
                        onClick={() => void reorderCategory(c, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="admin-btn secondary"
                        onClick={() => openEditCategory(c)}
                      >
                        Edit
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}

      {!loading &&
      (tab === "items" || tab === "products" || tab === "archived") ? (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              {tab === "products"
                ? "Products & Extras"
                : tab === "archived"
                  ? "Archived items"
                  : "Menu Items"}
            </h2>
            {tab !== "archived" ? (
              <button
                type="button"
                className="admin-btn"
                onClick={() =>
                  openCreateItem(
                    tab === "products" ? "accommodation_extra" : "food",
                  )
                }
              >
                Add {tab === "products" ? "Product" : "Menu Item"}
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="admin-muted">No items match these filters.</p>
          ) : (
            <>
              <div className="admin-table-wrap menu-desktop-only">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th />
                      <th>Name</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Price</th>
                      <th>Availability</th>
                      <th>Status</th>
                      <th>Featured</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="menu-thumb sm">
                            {thumbUrl(item) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumbUrl(item)!} alt="" />
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong>{item.name}</strong>
                          {item.sku ? (
                            <div className="admin-muted">SKU {item.sku}</div>
                          ) : null}
                        </td>
                        <td>{item.categoryName ?? "—"}</td>
                        <td>{typeLabel(item.itemType)}</td>
                        <td>
                          {formatMoney(item.price, item.currency)}
                          <div className="admin-muted">
                            {priceUnitLabel(item.priceUnit)}
                          </div>
                          {item.promotionalPrice != null ? (
                            <div className="menu-promo">
                              Promo{" "}
                              {formatMoney(item.promotionalPrice, item.currency)}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <span
                            className={`admin-badge ${item.isAvailable ? "ok" : "warn"}`}
                          >
                            {item.isAvailable ? "Available" : "Unavailable"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`admin-badge ${item.isActive ? "ok" : "off"}`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>{item.isFeatured ? "Yes" : "—"}</td>
                        <td>
                          <div className="menu-actions">
                            <button
                              type="button"
                              className="admin-btn secondary"
                              onClick={() =>
                                setActionsOpenId(
                                  actionsOpenId === item.id ? null : item.id,
                                )
                              }
                            >
                              Actions
                            </button>
                            {actionsOpenId === item.id ? (
                              <div className="menu-actions-menu">
                                <button
                                  type="button"
                                  onClick={() => void openEditItem(item)}
                                >
                                  Edit
                                </button>
                                {tab === "archived" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void runItemAction(item.id, "restore")
                                    }
                                  >
                                    Restore
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void runItemAction(
                                          item.id,
                                          "toggle_available",
                                        )
                                      }
                                    >
                                      Toggle available
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void runItemAction(
                                          item.id,
                                          "toggle_active",
                                        )
                                      }
                                    >
                                      Toggle active
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void runItemAction(
                                          item.id,
                                          "toggle_featured",
                                        )
                                      }
                                    >
                                      Toggle featured
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void runItemAction(item.id, "duplicate")
                                      }
                                    >
                                      Duplicate
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirm({
                                          title: "Archive item",
                                          message: `Archive “${item.name}”? It will be hidden from the public menu.`,
                                          confirmLabel: "Archive",
                                          onConfirm: () =>
                                            runItemAction(item.id, "archive"),
                                        })
                                      }
                                    >
                                      Archive
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() =>
                                    setConfirm({
                                      title: "Delete item",
                                      message: `Permanently delete “${item.name}”? Linked booking extras will block this.`,
                                      confirmLabel: "Delete",
                                      danger: true,
                                      onConfirm: () => deleteItem(item.id),
                                    })
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="menu-mobile-cards">
                {items.map((item) => (
                  <article key={item.id} className="menu-item-card">
                    <div className="menu-thumb">
                      {thumbUrl(item) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbUrl(item)!} alt="" />
                      ) : (
                        <span>No image</span>
                      )}
                    </div>
                    <div className="menu-item-card-body">
                      <strong>{item.name}</strong>
                      <p className="admin-muted">
                        {item.categoryName ?? "—"} · {typeLabel(item.itemType)}
                      </p>
                      <p>
                        {formatMoney(item.price, item.currency)}
                        <span className="admin-muted">
                          {" "}
                          · {priceUnitLabel(item.priceUnit)}
                        </span>
                      </p>
                      <div className="admin-actions" style={{ marginTop: 8 }}>
                        <span
                          className={`admin-badge ${item.isAvailable ? "ok" : "warn"}`}
                        >
                          {item.isAvailable ? "Available" : "Unavailable"}
                        </span>
                        <span
                          className={`admin-badge ${item.isActive ? "ok" : "off"}`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                        {item.isFeatured ? (
                          <span className="admin-badge featured">Featured</span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="admin-btn secondary"
                      onClick={() => void openEditItem(item)}
                    >
                      Edit
                    </button>
                  </article>
                ))}
              </div>

              <div className="admin-pagination">
                <button
                  type="button"
                  className="admin-btn secondary"
                  disabled={page <= 1 || busy}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  type="button"
                  className="admin-btn secondary"
                  disabled={!hasMore || busy}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {itemModalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeItemModal();
          }}
        >
          <div
            className="admin-modal menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-modal-title"
          >
            <div className="admin-card-head">
              <h3 id="item-modal-title">
                {editingItemId ? "Edit item" : "Add menu item"}
              </h3>
              <button
                type="button"
                className="admin-btn ghost"
                onClick={closeItemModal}
              >
                Close
              </button>
            </div>

            <form className="admin-form wide" onSubmit={(e) => void saveItem(e)}>
              <div className="admin-form-row">
                <label>
                  Name
                  <input
                    className="admin-input"
                    required
                    value={itemForm.name}
                    onChange={(e) => updateItemField("name", e.target.value)}
                  />
                </label>
                <label>
                  Slug
                  <input
                    className="admin-input"
                    value={itemForm.slug}
                    onChange={(e) => {
                      setSlugManual(true);
                      updateItemField("slug", e.target.value);
                    }}
                  />
                </label>
              </div>

              <div className="admin-form-row">
                <label>
                  Item type
                  <select
                    className="admin-input"
                    value={itemForm.itemType}
                    onChange={(e) =>
                      updateItemField(
                        "itemType",
                        e.target.value as MenuItemType,
                      )
                    }
                  >
                    {MENU_ITEM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {MENU_ITEM_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Category
                  <select
                    className="admin-input"
                    required
                    value={itemForm.categoryId}
                    onChange={(e) =>
                      updateItemField("categoryId", e.target.value)
                    }
                  >
                    <option value="">Select…</option>
                    {(categoriesForItemForm.length
                      ? categoriesForItemForm
                      : activeCategories
                    ).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Short description
                <input
                  className="admin-input"
                  value={itemForm.shortDescription}
                  onChange={(e) =>
                    updateItemField("shortDescription", e.target.value)
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={itemForm.description}
                  onChange={(e) =>
                    updateItemField("description", e.target.value)
                  }
                />
              </label>

              <div className="admin-form-row">
                <label>
                  SKU
                  <input
                    className="admin-input"
                    value={itemForm.sku}
                    onChange={(e) => updateItemField("sku", e.target.value)}
                  />
                </label>
                <label>
                  Tags
                  <input
                    className="admin-input"
                    placeholder="comma-separated"
                    value={itemForm.tags}
                    onChange={(e) => updateItemField("tags", e.target.value)}
                  />
                </label>
              </div>

              <div className="admin-form-row">
                <label>
                  Standard price
                  <input
                    className="admin-input"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={itemForm.price}
                    onChange={(e) => updateItemField("price", e.target.value)}
                  />
                </label>
                <label>
                  Promotional price
                  <input
                    className="admin-input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={itemForm.promotionalPrice}
                    onChange={(e) =>
                      updateItemField("promotionalPrice", e.target.value)
                    }
                  />
                </label>
              </div>

              <div className="admin-form-row">
                <label>
                  Currency
                  <input
                    className="admin-input"
                    value={itemForm.currency}
                    onChange={(e) =>
                      updateItemField("currency", e.target.value)
                    }
                  />
                </label>
                <label>
                  Price unit
                  <select
                    className="admin-input"
                    value={itemForm.priceUnit}
                    onChange={(e) =>
                      updateItemField("priceUnit", e.target.value)
                    }
                  >
                    {PRICE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {PRICE_UNIT_LABELS[u]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-form-row">
                <label>
                  Quantity available
                  <input
                    className="admin-input"
                    type="number"
                    min={0}
                    value={itemForm.quantityAvailable}
                    onChange={(e) =>
                      updateItemField("quantityAvailable", e.target.value)
                    }
                  />
                </label>
                <label>
                  Prep time (minutes)
                  <input
                    className="admin-input"
                    type="number"
                    min={0}
                    value={itemForm.preparationTimeMinutes}
                    onChange={(e) =>
                      updateItemField("preparationTimeMinutes", e.target.value)
                    }
                  />
                </label>
              </div>

              <div className="admin-form-row">
                <label>
                  Available from
                  <input
                    className="admin-input"
                    type="date"
                    value={itemForm.availableFrom}
                    onChange={(e) =>
                      updateItemField("availableFrom", e.target.value)
                    }
                  />
                </label>
                <label>
                  Available until
                  <input
                    className="admin-input"
                    type="date"
                    value={itemForm.availableUntil}
                    onChange={(e) =>
                      updateItemField("availableUntil", e.target.value)
                    }
                  />
                </label>
              </div>

              <div className="menu-check-grid">
                {(
                  [
                    ["isActive", "Active"],
                    ["isAvailable", "Available"],
                    ["isFeatured", "Featured"],
                    ["allowPreOrder", "Allow pre-order"],
                    ["allowRoomBooking", "Allow room booking"],
                    ["allowConferenceBooking", "Allow conference booking"],
                    ["publicVisible", "Public visible"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="menu-check">
                    <input
                      type="checkbox"
                      checked={itemForm[key]}
                      onChange={(e) => updateItemField(key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>

              {showFoodFields ? (
                <fieldset className="menu-fieldset">
                  <legend>Dietary</legend>
                  <div className="menu-check-grid">
                    {(
                      [
                        ["isVegetarian", "Vegetarian"],
                        ["isVegan", "Vegan"],
                        ["isHalal", "Halal"],
                        ["isGlutenFree", "Gluten free"],
                        ["containsNuts", "Contains nuts"],
                        ["isSpicy", "Spicy"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="menu-check">
                        <input
                          type="checkbox"
                          checked={itemForm[key]}
                          onChange={(e) =>
                            updateItemField(key, e.target.checked)
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <label>
                    Allergens
                    <input
                      className="admin-input"
                      value={itemForm.allergens}
                      onChange={(e) =>
                        updateItemField("allergens", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Ingredients
                    <textarea
                      className="admin-textarea"
                      rows={2}
                      value={itemForm.ingredients}
                      onChange={(e) =>
                        updateItemField("ingredients", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Serving size
                    <input
                      className="admin-input"
                      value={itemForm.servingSize}
                      onChange={(e) =>
                        updateItemField("servingSize", e.target.value)
                      }
                    />
                  </label>
                </fieldset>
              ) : null}

              <div className="admin-form-row">
                <label>
                  Display order
                  <input
                    className="admin-input"
                    type="number"
                    value={itemForm.displayOrder}
                    onChange={(e) =>
                      updateItemField("displayOrder", e.target.value)
                    }
                  />
                </label>
                <label>
                  Admin notes
                  <input
                    className="admin-input"
                    value={itemForm.adminNotes}
                    onChange={(e) =>
                      updateItemField("adminNotes", e.target.value)
                    }
                  />
                </label>
              </div>

              <div className="admin-actions">
                <button className="admin-btn" type="submit" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : editingItemId
                      ? "Save changes"
                      : "Create item"}
                </button>
                <button
                  className="admin-btn secondary"
                  type="button"
                  onClick={closeItemModal}
                >
                  Cancel
                </button>
              </div>
            </form>

            <div className="menu-images-section">
              <h4>Images</h4>
              <p className="admin-muted" style={{ marginTop: 0 }}>
                {editingItemId
                  ? "Upload JPG, PNG or WebP images (max 5 MB each)."
                  : "Choose images now — they upload automatically when you create the item. JPG, PNG or WebP, max 5 MB each."}
              </p>
              {editingItemId
                ? (() => {
                    const featuredPreview =
                      itemImages.find((i) => i.isFeatured)?.imageUrl ||
                      itemImages[0]?.imageUrl ||
                      legacyImageUrl;
                    if (!featuredPreview) return null;
                    return (
                      <div className="menu-current-image">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={featuredPreview}
                          alt={itemForm.name || "Current item image"}
                        />
                        <div>
                          <strong>Current featured image</strong>
                          <p className="admin-muted">
                            {itemImages.length
                              ? "Shown on the public menu and in admin lists."
                              : "Existing image on this item. Upload below to add gallery images or replace it."}
                          </p>
                        </div>
                      </div>
                    );
                  })()
                : pendingImages[0]
                  ? (
                      <div className="menu-current-image">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pendingImages[0].previewUrl}
                          alt={itemForm.name || "Selected image"}
                        />
                        <div>
                          <strong>Selected featured image</strong>
                          <p className="admin-muted">
                            First image becomes featured when the item is created.
                          </p>
                        </div>
                      </div>
                    )
                  : null}
              <div
                className="menu-upload-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void uploadImages(e.dataTransfer.files);
                }}
              >
                <p>Drag & drop images here, or</p>
                <button
                  type="button"
                  className="admin-btn secondary"
                  disabled={uploading || busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading
                    ? "Uploading…"
                    : editingItemId
                      ? "Choose files"
                      : "Choose images"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  hidden
                  onChange={(e) => void uploadImages(e.target.files)}
                />
              </div>

              {!editingItemId && pendingImages.length > 0 ? (
                <div className="menu-upload-grid">
                  {pendingImages.map((img, index) => (
                    <figure key={img.key} className="menu-upload-tile">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.previewUrl} alt={img.file.name} />
                      {index === 0 ? (
                        <span className="menu-featured-tag">Featured</span>
                      ) : null}
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn danger"
                          onClick={() => removePendingImage(img.key)}
                        >
                          Remove
                        </button>
                      </div>
                    </figure>
                  ))}
                </div>
              ) : null}

              {editingItemId && itemImages.length === 0 && !legacyImageUrl ? (
                <p className="admin-muted">No images yet.</p>
              ) : null}
              {editingItemId && itemImages.length === 0 && legacyImageUrl ? (
                <div className="menu-upload-grid">
                  <figure className="menu-upload-tile">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={legacyImageUrl} alt={itemForm.name || ""} />
                    <span className="menu-featured-tag">Current</span>
                  </figure>
                </div>
              ) : null}
              {editingItemId && itemImages.length > 0 ? (
                <>
                  <div className="menu-upload-grid">
                    {(imagesExpanded
                      ? itemImages
                      : itemImages.slice(0, 4)
                    ).map((img) => (
                      <figure key={img.id} className="menu-upload-tile">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.imageUrl} alt={img.altText ?? ""} />
                        {img.isFeatured ? (
                          <span className="menu-featured-tag">Featured</span>
                        ) : null}
                        <div className="admin-actions">
                          {!img.isFeatured ? (
                            <button
                              type="button"
                              className="admin-btn ghost"
                              onClick={() => void featureImage(img.id)}
                            >
                              Set featured
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="admin-btn danger"
                            onClick={() =>
                              setConfirm({
                                title: "Remove image",
                                message: "Remove this image from the gallery?",
                                confirmLabel: "Remove",
                                danger: true,
                                onConfirm: () => removeImage(img.id),
                              })
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </figure>
                    ))}
                  </div>
                  {itemImages.length > 4 ? (
                    <button
                      type="button"
                      className="admin-btn secondary"
                      style={{ marginTop: 10 }}
                      onClick={() => setImagesExpanded((v) => !v)}
                    >
                      {imagesExpanded
                        ? "Show less"
                        : `Show more (+${itemImages.length - 4})`}
                    </button>
                  ) : null}
                </>
              ) : null}

              {!editingItemId && pendingImages.length === 0 ? (
                <p className="admin-muted">No images selected yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {categoryModalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCategoryModalOpen(false);
          }}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            style={{ width: "min(520px, 100%)" }}
          >
            <h3>
              {editingCategoryId ? "Edit category" : "Add category"}
            </h3>
            <form
              className="admin-form"
              onSubmit={(e) => void saveCategory(e)}
            >
              <label>
                Name
                <input
                  className="admin-input"
                  required
                  value={categoryForm.name}
                  onChange={(e) => updateCategoryField("name", e.target.value)}
                />
              </label>
              <label>
                Slug
                <input
                  className="admin-input"
                  value={categoryForm.slug}
                  onChange={(e) => {
                    setCategorySlugManual(true);
                    updateCategoryField("slug", e.target.value);
                  }}
                />
              </label>
              <label>
                Description
                <textarea
                  className="admin-textarea"
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) =>
                    updateCategoryField("description", e.target.value)
                  }
                />
              </label>
              <div className="admin-form-row">
                <label>
                  Item type
                  <select
                    className="admin-input"
                    value={categoryForm.itemType}
                    onChange={(e) =>
                      updateCategoryField(
                        "itemType",
                        e.target.value as MenuItemType,
                      )
                    }
                  >
                    {MENU_ITEM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {MENU_ITEM_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Display order
                  <input
                    className="admin-input"
                    type="number"
                    value={categoryForm.displayOrder}
                    onChange={(e) =>
                      updateCategoryField("displayOrder", e.target.value)
                    }
                  />
                </label>
              </div>
              <label className="menu-check">
                <input
                  type="checkbox"
                  checked={categoryForm.isActive}
                  onChange={(e) =>
                    updateCategoryField("isActive", e.target.checked)
                  }
                />
                Active
              </label>
              <div className="admin-actions">
                <button className="admin-btn" type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save category"}
                </button>
                <button
                  className="admin-btn secondary"
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {confirm ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <h3>{confirm.title}</h3>
            <p>{confirm.message}</p>
            <div className="admin-quick-actions">
              <button
                type="button"
                className={`admin-btn${confirm.danger ? " danger" : ""}`}
                disabled={busy}
                onClick={() => void confirm.onConfirm()}
              >
                {busy ? "Working…" : confirm.confirmLabel}
              </button>
              <button
                type="button"
                className="admin-btn secondary"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
