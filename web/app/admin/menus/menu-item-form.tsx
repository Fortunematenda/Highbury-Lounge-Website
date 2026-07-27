"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Save, Settings2, UtensilsCrossed, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  AdminLangTabs,
  buildTranslationDraft,
} from "@/app/admin/components/AdminLangTabs";
import {
  AdminImageGalleryField,
  menuItemGalleryEndpoints,
  type GalleryImage,
} from "@/app/admin/components/AdminImageGalleryField";
import {
  DetailFieldGrid,
  DetailFieldSpan,
  DetailMetadataCard,
  DetailPageShell,
  DetailSectionCard,
  DetailStickyActionBar,
  StatusBadge,
} from "@/app/admin/components/detail-page";
import {
  AdminFormField,
  AdminSelect,
  AdminTextInput,
  AdminTextarea,
} from "@/app/admin/components/form-fields";
import {
  stringifyTranslations,
  type ContentTranslations,
} from "@/lib/i18n/content";
import type { AppLocale } from "@/lib/i18n/locales";

const schema = z.object({
  categoryId: z.number().min(1, "Select a category"),
  price: z.number().min(0, "Enter a valid price"),
  priceUnit: z.string().min(1),
  itemType: z.string().min(1),
  sku: z.string().optional(),
  isActive: z.boolean(),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
  allowPreOrder: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type CategoryOption = { id: number; name: string };

type MenuItemPayload = {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  shortDescription?: string | null;
  categoryId: number;
  price: number;
  priceUnit: string;
  itemType: string;
  sku: string | null;
  isActive: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  allowPreOrder: boolean;
  imageUrl: string | null;
  translationsJson?: string | null;
  images?: Array<{ id: number; imageUrl: string; altText?: string | null }>;
};

export function MenuItemForm({
  mode,
  categories,
  initial,
  lastChange,
}: {
  mode: "create" | "edit";
  categories: CategoryOption[];
  initial?: MenuItemPayload | null;
  lastChange?: {
    label: string;
    email: string | null;
    at: string;
  } | null;
}) {
  const router = useRouter();
  const [lang, setLang] = useState<AppLocale>("en");
  const [translations, setTranslations] = useState<ContentTranslations>(() =>
    mode === "edit" && initial
      ? buildTranslationDraft(
          {
            name: initial.name,
            description: initial.description ?? "",
            shortDescription: initial.shortDescription ?? "",
          },
          initial.translationsJson,
        )
      : { en: { name: "", description: "", shortDescription: "" } },
  );
  const [featuredUrl, setFeaturedUrl] = useState<string | null>(
    initial?.imageUrl ?? null,
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [contentDirty, setContentDirty] = useState(false);

  const galleryImages: GalleryImage[] = useMemo(
    () =>
      (initial?.images ?? []).map((img) => ({
        id: img.id,
        url: img.imageUrl,
        altText: img.altText,
      })),
    [initial?.images],
  );

  const form = useForm<FormValues>({
    // zod v4 + RHF resolver typing mismatch; runtime is fine
    resolver: zodResolver(schema) as never,
    defaultValues: {
      categoryId: initial?.categoryId ?? categories[0]?.id ?? 0,
      price: initial?.price ?? 0,
      priceUnit: initial?.priceUnit ?? "each",
      itemType: initial?.itemType ?? "food",
      sku: initial?.sku ?? "",
      isActive: initial?.isActive ?? true,
      isAvailable: initial?.isAvailable ?? true,
      isFeatured: initial?.isFeatured ?? false,
      allowPreOrder: initial?.allowPreOrder ?? false,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = form;

  const dirty = isDirty || contentDirty || pendingFiles.length > 0;
  const current = translations[lang] ?? {};

  useEffect(() => {
    if (!initial) return;
    reset({
      categoryId: initial.categoryId,
      price: initial.price,
      priceUnit: initial.priceUnit,
      itemType: initial.itemType,
      sku: initial.sku ?? "",
      isActive: initial.isActive,
      isAvailable: initial.isAvailable,
      isFeatured: initial.isFeatured,
      allowPreOrder: initial.allowPreOrder,
    });
  }, [initial, reset]);

  function updateField(
    field: "name" | "description" | "shortDescription",
    value: string,
  ) {
    setContentDirty(true);
    setTranslations((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }));
  }

  async function onSubmit(values: FormValues) {
    setBusy(true);
    const en = translations.en ?? {};
    const englishName = (en.name || initial?.name || "").trim();
    if (!englishName) {
      toast.error("Enter a product name in English.");
      setBusy(false);
      return;
    }

    const payload = {
      ...values,
      name: englishName,
      description: en.description ?? "",
      shortDescription: en.shortDescription ?? "",
      imageUrl: featuredUrl,
      translationsJson: stringifyTranslations({
        ...translations,
        en: {
          name: englishName,
          description: en.description ?? "",
          shortDescription: en.shortDescription ?? "",
        },
      }),
    };

    try {
      const res = await fetch(
        mode === "create"
          ? "/api/admin/menu/items"
          : `/api/admin/menu/items/${initial!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save product");

      const itemId = data.item?.id ?? initial?.id;
      if (mode === "create" && pendingFiles.length && itemId) {
        for (let i = 0; i < pendingFiles.length; i += 1) {
          const fd = new FormData();
          fd.append("file", pendingFiles[i]);
          if (i === 0) fd.append("featured", "1");
          const upload = await fetch(
            `/api/admin/menu/items/${itemId}/images`,
            { method: "POST", body: fd },
          );
          if (!upload.ok) {
            const uploadData = await upload.json().catch(() => ({}));
            throw new Error(
              uploadData.error ||
                "Product created, but an image upload failed.",
            );
          }
        }
      }

      toast.success(mode === "create" ? "Created" : "Saved");
      setContentDirty(false);
      setPendingFiles([]);
      reset(values);
      window.setTimeout(() => {
        if (mode === "create" && itemId) {
          router.push(`/admin/menus/items/${itemId}`);
        }
        router.refresh();
      }, 700);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save product");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "create" ? "Add menu product" : initial?.name || "Edit product";

  return (
    <DetailPageShell
      pageTitle={title}
      breadcrumbs={[
        { label: "Menus & Products", href: "/admin/menus" },
        {
          label: mode === "create" ? "Add product" : initial?.name || "Edit",
        },
      ]}
      title={title}
      description="Menu product details shown on the public website."
      status={
        mode === "edit" ? (
          <>
            <StatusBadge
              status={watch("isAvailable") ? "Available" : "Unavailable"}
              tone={watch("isAvailable") ? "success" : "neutral"}
            />
            <StatusBadge
              status={watch("isActive") ? "Active" : "Inactive"}
              tone={watch("isActive") ? "success" : "neutral"}
            />
          </>
        ) : undefined
      }
      backAction={{ label: "Back to menus", href: "/admin/menus" }}
      sidebar={
        mode === "edit" ? (
          <DetailMetadataCard
            items={[
              {
                label: "Last changed by",
                value: lastChange ? (
                  <>
                    {lastChange.label}
                    {lastChange.email ? (
                      <>
                        <br />
                        <span className="admin-muted">{lastChange.email}</span>
                      </>
                    ) : null}
                    <br />
                    <span className="admin-muted">{lastChange.at}</span>
                  </>
                ) : (
                  "No changes recorded yet"
                ),
              },
            ]}
          />
        ) : undefined
      }
    >
      <form
        id="menu-item-form"
        className="detail-form-stack"
        onSubmit={handleSubmit(onSubmit)}
      >
        <DetailSectionCard
          title="Content"
          icon={UtensilsCrossed}
          headerAction={
            <AdminLangTabs
              lang={lang}
              onChange={setLang}
              translations={translations}
            />
          }
        >
          <DetailFieldGrid columns={2}>
            <AdminFormField label="Name" required={lang === "en"}>
              <AdminTextInput
                value={current.name ?? ""}
                required={lang === "en"}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </AdminFormField>
            <AdminFormField
              label="Category"
              required
              error={errors.categoryId?.message}
            >
              <AdminSelect {...register("categoryId", { valueAsNumber: true })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </AdminSelect>
            </AdminFormField>
            <DetailFieldSpan>
              <AdminFormField label="Short description">
                <AdminTextInput
                  value={current.shortDescription ?? ""}
                  onChange={(e) =>
                    updateField("shortDescription", e.target.value)
                  }
                />
              </AdminFormField>
            </DetailFieldSpan>
            <DetailFieldSpan>
              <AdminFormField label="Description">
                <AdminTextarea
                  rows={4}
                  value={current.description ?? ""}
                  onChange={(e) => updateField("description", e.target.value)}
                />
              </AdminFormField>
            </DetailFieldSpan>
          </DetailFieldGrid>
        </DetailSectionCard>

        <DetailSectionCard title="Pricing" icon={Wallet}>
          <DetailFieldGrid columns={3}>
            <AdminFormField label="Price" required error={errors.price?.message}>
              <AdminTextInput
                type="number"
                step="0.01"
                min={0}
                {...register("price", { valueAsNumber: true })}
              />
            </AdminFormField>
            <AdminFormField label="Price unit">
              <AdminSelect {...register("priceUnit")}>
                <option value="each">Each</option>
                <option value="portion">Portion</option>
                <option value="person">Per person</option>
              </AdminSelect>
            </AdminFormField>
            <AdminFormField label="Type">
              <AdminSelect {...register("itemType")}>
                <option value="food">Food</option>
                <option value="drink">Drink</option>
                <option value="other">Other</option>
              </AdminSelect>
            </AdminFormField>
            <AdminFormField label="SKU code">
              <AdminTextInput {...register("sku")} />
            </AdminFormField>
          </DetailFieldGrid>
        </DetailSectionCard>

        <DetailSectionCard title="Images" icon={ImageIcon}>
          <AdminImageGalleryField
            recordId={mode === "edit" ? initial?.id : null}
            initialImages={galleryImages}
            featuredImage={featuredUrl}
            endpoints={
              mode === "edit" && initial
                ? menuItemGalleryEndpoints(initial.id)
                : undefined
            }
            onFeaturedChange={setFeaturedUrl}
            onPendingFilesChange={(files) => {
              setPendingFiles(files);
              setContentDirty(true);
            }}
          />
        </DetailSectionCard>

        <DetailSectionCard title="Publishing" icon={Settings2}>
          <div className="room-toggle-list">
            <label className="room-toggle">
              <span>
                <strong>Active</strong>
                <small>Visible in the admin catalogue</small>
              </span>
              <input type="checkbox" {...register("isActive")} />
            </label>
            <label className="room-toggle">
              <span>
                <strong>Available</strong>
                <small>Guests can order this item</small>
              </span>
              <input type="checkbox" {...register("isAvailable")} />
            </label>
            <label className="room-toggle">
              <span>
                <strong>Featured</strong>
                <small>Highlight on menu listings</small>
              </span>
              <input type="checkbox" {...register("isFeatured")} />
            </label>
            <label className="room-toggle">
              <span>
                <strong>Allow pre-order</strong>
                <small>Guests may pre-order with a booking</small>
              </span>
              <input type="checkbox" {...register("allowPreOrder")} />
            </label>
          </div>
          <div className="detail-inline-actions">
            <button className="admin-btn" type="submit" disabled={busy}>
              <Save size={16} aria-hidden />
              {busy
                ? "Saving…"
                : mode === "create"
                  ? "Create product"
                  : "Save changes"}
            </button>
          </div>
        </DetailSectionCard>
      </form>

      <DetailStickyActionBar
        visible={dirty && !busy}
        primaryAction={{
          label: mode === "create" ? "Create product" : "Save changes",
          icon: Save,
          onClick: () =>
            (
              document.getElementById("menu-item-form") as HTMLFormElement
            )?.requestSubmit(),
          loading: busy,
        }}
        cancelAction={{
          label: "Cancel",
          href: "/admin/menus",
          variant: "ghost",
        }}
      />
    </DetailPageShell>
  );
}
