"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Save, Settings2, Trash2, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  AdminLangTabs,
  buildTranslationDraft,
} from "@/app/admin/components/AdminLangTabs";
import { confirmDialog } from "@/app/admin/components/confirm-dialog";
import {
  AdminImageGalleryField,
  packageCoverEndpoints,
} from "@/app/admin/components/AdminImageGalleryField";
import {
  DetailDangerZone,
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
  AdminTextInput,
  AdminTextarea,
} from "@/app/admin/components/form-fields";
import {
  stringifyTranslations,
  type ContentTranslations,
} from "@/lib/i18n/content";
import type { AppLocale } from "@/lib/i18n/locales";
import { formatVenueDateTime } from "@/lib/timezone";

const schema = z.object({
  capacity: z.number().min(1, "Enter a capacity of at least 1"),
  basePrice: z.string().optional(),
  displayOrder: z.number().int(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export type PackageRecord = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  capacity: number;
  basePrice: number | null;
  imageUrl: string | null;
  featuresJson: string | null;
  isActive: boolean;
  displayOrder: number;
  translationsJson?: string | null;
};

export function PackageForm({
  mode,
  initial,
  lastChange,
}: {
  mode: "create" | "edit";
  initial?: PackageRecord | null;
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
            features: initial.featuresJson ?? "",
          },
          initial.translationsJson,
        )
      : { en: { name: "", description: "", features: "" } },
  );
  const [features, setFeatures] = useState(initial?.featuresJson ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(
    initial?.imageUrl ?? null,
  );
  const [pendingCover, setPendingCover] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<FormValues>({
    // zod v4 + RHF resolver typing mismatch on coerce; runtime is fine
    resolver: zodResolver(schema) as never,
    defaultValues: {
      capacity: initial?.capacity ?? 20,
      basePrice:
        initial?.basePrice != null ? String(initial.basePrice) : "",
      displayOrder: initial?.displayOrder ?? 0,
      isActive: initial?.isActive ?? true,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: rhfDirty },
    reset,
    watch,
  } = form;

  const [contentDirty, setContentDirty] = useState(false);
  const dirty = rhfDirty || contentDirty || pendingCover.length > 0;

  useEffect(() => {
    if (mode === "edit" && initial) {
      reset({
        capacity: initial.capacity,
        basePrice:
          initial.basePrice != null ? String(initial.basePrice) : "",
        displayOrder: initial.displayOrder,
        isActive: initial.isActive,
      });
    }
  }, [initial, mode, reset]);

  const current = translations[lang] ?? {};
  const langHint = useMemo(() => {
    if (lang === "en") return "English is the primary language for this package.";
    return "Optional. Empty fields fall back to English.";
  }, [lang]);

  function updateField(
    field: "name" | "description" | "features",
    value: string,
  ) {
    setContentDirty(true);
    setTranslations((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }));
    if (lang === "en" && field === "features") setFeatures(value);
  }

  async function onSubmit(values: FormValues) {
    setBusy(true);
    const en = translations.en ?? {};
    const englishName = (en.name || initial?.name || "").trim();
    if (!englishName) {
      toast.error("Enter a package name in English.");
      setBusy(false);
      return;
    }

    const payload = {
      name: englishName,
      description: en.description ?? "",
      capacity: values.capacity,
      basePrice: values.basePrice === "" ? null : Number(values.basePrice),
      featuresJson: features || en.features || null,
      imageUrl,
      isActive: values.isActive,
      displayOrder: values.displayOrder,
      translationsJson: stringifyTranslations({
        ...translations,
        en: {
          name: englishName,
          description: en.description ?? "",
          features: features || en.features || "",
        },
      }),
    };

    try {
      const res = await fetch(
        mode === "create"
          ? "/api/admin/packages"
          : `/api/admin/packages/${initial!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save package");

      const pkgId = data.package?.id ?? initial?.id;
      if (mode === "create" && pendingCover[0] && pkgId) {
        const fd = new FormData();
        fd.append("file", pendingCover[0]);
        const upload = await fetch(`/api/admin/packages/${pkgId}/image`, {
          method: "POST",
          body: fd,
        });
        if (!upload.ok) {
          const uploadData = await upload.json().catch(() => ({}));
          throw new Error(
            uploadData.error ||
              "Package created, but the cover image could not be uploaded.",
          );
        }
      }

      toast.success(mode === "create" ? "Created" : "Saved");
      setContentDirty(false);
      setPendingCover([]);
      reset(values);
      window.setTimeout(() => {
        if (mode === "create" && pkgId) {
          router.push(`/admin/packages/${pkgId}`);
        }
        router.refresh();
      }, 700);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save package");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!initial) return;
    if (
      !(await confirmDialog(
        `Delete “${initial.name}”? This cannot be undone.`,
      ))
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/packages/${initial.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete package");
      toast.success("Deleted");
      router.push("/admin/packages");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete package");
    } finally {
      setDeleting(false);
    }
  }

  const title =
    mode === "create" ? "Add package" : initial?.name || "Edit package";

  return (
    <DetailPageShell
      pageTitle={title}
      breadcrumbs={[
        { label: "Packages", href: "/admin/packages" },
        { label: mode === "create" ? "Add package" : initial?.name || "Edit" },
      ]}
      title={title}
      description="Conference venue details shown on the public website."
      status={
        mode === "edit" ? (
          <StatusBadge
            status={watch("isActive") ? "Active" : "Inactive"}
            tone={watch("isActive") ? "success" : "neutral"}
          />
        ) : undefined
      }
      backAction={{ label: "Back to packages", href: "/admin/packages" }}
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
                    <span className="admin-muted">
                      {formatVenueDateTime(lastChange.at, {
                        withSeconds: true,
                      })}
                    </span>
                  </>
                ) : (
                  "No changes recorded yet"
                ),
              },
              { label: "Page address", value: initial?.slug },
            ]}
          />
        ) : undefined
      }
    >
      <form
        id="package-form"
        className="detail-form-stack"
        onSubmit={handleSubmit(onSubmit)}
      >
        <DetailSectionCard
          title="Content"
          icon={Users}
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
            <AdminFormField
              label="Name"
              required={lang === "en"}
            >
              <AdminTextInput
                value={current.name ?? ""}
                required={lang === "en"}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </AdminFormField>
            <DetailFieldSpan>
              <AdminFormField label="Description">
                <AdminTextarea
                  rows={4}
                  value={current.description ?? ""}
                  onChange={(e) => updateField("description", e.target.value)}
                />
              </AdminFormField>
            </DetailFieldSpan>
            <DetailFieldSpan>
              <AdminFormField
                label="Included features"
                hint="One feature per line"
              >
                <AdminTextarea
                  rows={4}
                  value={
                    lang === "en"
                      ? features
                      : (current.features ?? "")
                  }
                  onChange={(e) => updateField("features", e.target.value)}
                />
              </AdminFormField>
            </DetailFieldSpan>
          </DetailFieldGrid>
        </DetailSectionCard>

        <DetailSectionCard title="Pricing & capacity" icon={Wallet}>
          <DetailFieldGrid columns={3}>
            <AdminFormField
              label="Capacity"
              required
              error={errors.capacity?.message}
            >
              <AdminTextInput
                type="number"
                min={1}
                {...register("capacity", { valueAsNumber: true })}
              />
            </AdminFormField>
            <AdminFormField
              label="Base price"
              error={errors.basePrice?.message}
            >
              <AdminTextInput
                type="number"
                step="0.01"
                min={0}
                {...register("basePrice")}
              />
            </AdminFormField>
            <AdminFormField label="Sort order">
              <AdminTextInput
                type="number"
                {...register("displayOrder", { valueAsNumber: true })}
              />
            </AdminFormField>
          </DetailFieldGrid>
        </DetailSectionCard>

        <DetailSectionCard title="Cover image" icon={ImageIcon}>
          <AdminImageGalleryField
            recordId={mode === "edit" ? initial?.id : null}
            featuredImage={imageUrl}
            initialImages={
              imageUrl && initial
                ? [{ id: initial.id, url: imageUrl }]
                : []
            }
            endpoints={
              mode === "edit" && initial
                ? packageCoverEndpoints(initial.id)
                : undefined
            }
            single
            label="Package photo"
            hint="Shown on the conference packages page."
            onFeaturedChange={setImageUrl}
            onPendingFilesChange={(files) => {
              setPendingCover(files);
              setContentDirty(true);
            }}
          />
        </DetailSectionCard>

        <DetailSectionCard title="Publishing" icon={Settings2}>
          <label className="room-toggle">
            <span>
              <strong>Active</strong>
              <small>Show this package on the website</small>
            </span>
            <input type="checkbox" {...register("isActive")} />
          </label>
          <div className="detail-inline-actions">
            <button className="admin-btn" type="submit" disabled={busy}>
              <Save size={16} aria-hidden />
              {busy
                ? "Saving…"
                : mode === "create"
                  ? "Create package"
                  : "Save changes"}
            </button>
          </div>
        </DetailSectionCard>

        {mode === "edit" ? (
          <DetailDangerZone
            title="Delete package"
            description="Remove this package from the website permanently."
            action={{
              label: deleting ? "Deleting…" : "Delete package",
              icon: Trash2,
              loading: deleting,
              disabled: busy || deleting,
              onClick: () => void onDelete(),
            }}
          />
        ) : null}
      </form>

      <DetailStickyActionBar
        visible={dirty && !busy}
        primaryAction={{
          label: mode === "create" ? "Create package" : "Save changes",
          icon: Save,
          type: "submit",
          onClick: () => {
            const formEl = document.getElementById(
              "package-form",
            ) as HTMLFormElement | null;
            formEl?.requestSubmit();
          },
          loading: busy,
        }}
        cancelAction={{
          label: "Discard",
          variant: "ghost",
          onClick: () => {
            if (mode === "create") router.push("/admin/packages");
            else router.refresh();
            setContentDirty(false);
            setPendingCover([]);
            if (initial) {
              reset({
                capacity: initial.capacity,
                basePrice:
                  initial.basePrice != null ? String(initial.basePrice) : "",
                displayOrder: initial.displayOrder,
                isActive: initial.isActive,
              });
            }
          },
        }}
      />
    </DetailPageShell>
  );
}
