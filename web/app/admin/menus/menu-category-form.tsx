"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FolderTree, Save, Settings2 } from "lucide-react";
import {
  AdminLangTabs,
  buildTranslationDraft,
} from "@/app/admin/components/AdminLangTabs";
import {
  DetailFieldGrid,
  DetailPageShell,
  DetailSectionCard,
  DetailStickyActionBar,
  StatusBadge,
  UnsavedChangesGuard,
} from "@/app/admin/components/detail-page";
import {
  AdminFormField,
  AdminSelect,
  AdminTextInput,
  AdminTextarea,
} from "@/app/admin/components/form-fields";
import {
  MENU_ITEM_TYPES,
  MENU_ITEM_TYPE_LABELS,
  type MenuItemType,
} from "@/lib/menu-constants";
import { slugify } from "@/lib/slug";
import {
  stringifyTranslations,
  type ContentTranslations,
} from "@/lib/i18n/content";
import type { AppLocale } from "@/lib/i18n/locales";

const schema = z.object({
  slug: z.string().optional(),
  itemType: z.string().min(1),
  displayOrder: z.number().int(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export type MenuCategoryPayload = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  itemType: string;
  displayOrder: number;
  isActive: boolean;
  translationsJson?: string | null;
};

export function MenuCategoryForm({
  mode,
  initial,
  defaultItemType,
}: {
  mode: "create" | "edit";
  initial?: MenuCategoryPayload | null;
  defaultItemType?: MenuItemType;
}) {
  const router = useRouter();
  const [lang, setLang] = useState<AppLocale>("en");
  const [translations, setTranslations] = useState<ContentTranslations>(() =>
    mode === "edit" && initial
      ? buildTranslationDraft(
          {
            name: initial.name,
            description: initial.description ?? "",
          },
          initial.translationsJson,
        )
      : { en: { name: "", description: "" } },
  );
  const [slugManual, setSlugManual] = useState(mode === "edit");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [contentDirty, setContentDirty] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      slug: initial?.slug ?? "",
      itemType:
        initial?.itemType ??
        defaultItemType ??
        "food",
      displayOrder: initial?.displayOrder ?? 0,
      isActive: initial?.isActive ?? true,
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = form;

  const dirty = isDirty || contentDirty;
  const current = translations[lang] ?? {};
  const slug = watch("slug");

  useEffect(() => {
    if (!initial) return;
    reset({
      slug: initial.slug,
      itemType: initial.itemType,
      displayOrder: initial.displayOrder,
      isActive: initial.isActive,
    });
  }, [initial, reset]);

  function updateField(field: "name" | "description", value: string) {
    setContentDirty(true);
    setTranslations((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }));
    if (lang === "en" && field === "name" && !slugManual) {
      setValue("slug", slugify(value), { shouldDirty: true });
    }
  }

  async function onSubmit(values: FormValues) {
    setBusy(true);
    setError("");
    setSuccess("");
    const en = translations.en ?? {};
    const englishName = (en.name || initial?.name || "").trim();
    if (!englishName) {
      setError("Enter a category name in English.");
      setBusy(false);
      return;
    }

    const payload = {
      name: englishName,
      slug: (values.slug || "").trim() || slugify(englishName),
      description: (en.description ?? "").trim() || null,
      itemType: values.itemType,
      displayOrder: values.displayOrder,
      isActive: values.isActive,
      translationsJson: stringifyTranslations({
        ...translations,
        en: {
          name: englishName,
          description: (en.description ?? "").trim(),
        },
      }),
    };

    try {
      const res = await fetch(
        mode === "create"
          ? "/api/admin/menu/categories"
          : `/api/admin/menu/categories/${initial!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save category");

      setSuccess(
        mode === "create" ? "Created successfully." : "Saved successfully.",
      );
      setContentDirty(false);
      reset(values);
      const categoryId = data.category?.id ?? initial?.id;
      window.setTimeout(() => {
        if (mode === "create" && categoryId) {
          router.push(`/admin/menus/categories/${categoryId}`);
        } else {
          router.push("/admin/menus");
          router.refresh();
        }
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save category.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "create" ? "Add category" : initial?.name || "Edit category";
  const langHint =
    lang === "en"
      ? "English is the primary language for this category."
      : "Optional. Empty fields fall back to English.";

  return (
    <DetailPageShell
      pageTitle={title}
      breadcrumbs={[
        { label: "Menus & Products", href: "/admin/menus" },
        { label: mode === "create" ? "Add category" : initial?.name || "Edit" },
      ]}
      title={title}
      description="Groups menu products on the public website."
      status={
        mode === "edit" ? (
          <StatusBadge
            status={watch("isActive") ? "Active" : "Inactive"}
            tone={watch("isActive") ? "success" : "neutral"}
          />
        ) : undefined
      }
      backAction={{ label: "Back to menus", href: "/admin/menus" }}
    >
      <UnsavedChangesGuard dirty={dirty} />
      {error ? (
        <div className="admin-error" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="admin-success" role="status">
          {success}
        </div>
      ) : null}

      <form
        id="menu-category-form"
        className="detail-form-stack"
        onSubmit={handleSubmit(onSubmit)}
      >
        <DetailSectionCard
          title="Content"
          icon={FolderTree}
          headerAction={
            <AdminLangTabs
              lang={lang}
              onChange={setLang}
              translations={translations}
            />
          }
        >
          <p className="page-sub detail-inline-hint">{langHint}</p>
          <DetailFieldGrid columns={2}>
            <AdminFormField label="Name" required={lang === "en"}>
              <AdminTextInput
                value={current.name ?? ""}
                required={lang === "en"}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </AdminFormField>
            {lang === "en" ? (
              <AdminFormField
                label="Page address"
                hint="Used in website URLs. Leave blank to generate from the name."
              >
                <AdminTextInput
                  value={slug ?? ""}
                  onChange={(e) => {
                    setSlugManual(true);
                    setValue("slug", e.target.value, { shouldDirty: true });
                  }}
                />
              </AdminFormField>
            ) : null}
            <AdminFormField label="Description">
              <AdminTextarea
                rows={3}
                value={current.description ?? ""}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </AdminFormField>
          </DetailFieldGrid>
        </DetailSectionCard>

        <DetailSectionCard title="Settings" icon={Settings2}>
          {lang === "en" ? (
            <DetailFieldGrid columns={3}>
              <AdminFormField
                label="Item type"
                error={errors.itemType?.message}
              >
                <AdminSelect {...register("itemType")}>
                  {MENU_ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {MENU_ITEM_TYPE_LABELS[t]}
                    </option>
                  ))}
                </AdminSelect>
              </AdminFormField>
              <AdminFormField label="Sort order">
                <AdminTextInput
                  type="number"
                  {...register("displayOrder", { valueAsNumber: true })}
                />
              </AdminFormField>
              <AdminFormField label="Status">
                <label className="menu-check" style={{ marginTop: 8 }}>
                  <input type="checkbox" {...register("isActive")} />
                  Active
                </label>
              </AdminFormField>
            </DetailFieldGrid>
          ) : (
            <p className="admin-muted">
              Type, order, and active status stay shared across languages.
            </p>
          )}
        </DetailSectionCard>
      </form>

      <DetailStickyActionBar
        visible={dirty && !busy}
        primaryAction={{
          label: mode === "create" ? "Create category" : "Save changes",
          icon: Save,
          onClick: () =>
            (
              document.getElementById("menu-category-form") as HTMLFormElement
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
