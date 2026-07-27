"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import {
  DetailFieldGrid,
  DetailPageShell,
  DetailSectionCard,
  DetailStickyActionBar,
  UnsavedChangesGuard,
} from "@/app/admin/components/detail-page";
import {
  AdminFormField,
  AdminSelect,
  AdminTextInput,
  AdminTextarea,
} from "@/app/admin/components/form-fields";

const schema = z
  .object({
    roomTypeId: z.number().min(1, "Select a room"),
    startDate: z.string().min(1, "Enter a start date"),
    endDate: z.string().min(1, "Enter an end date"),
    roomsBlocked: z.number().min(1, "Block at least 1 room"),
    reason: z.string().min(1, "Select a reason"),
    adminNote: z.string().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "The end date must be on or after the start date",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof schema>;

export function BlockCreateForm({
  rooms,
}: {
  rooms: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      roomTypeId: rooms[0]?.id ?? 0,
      startDate: "",
      endDate: "",
      roomsBlocked: 1,
      reason: "Maintenance",
      adminNote: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = form;

  async function onSubmit(values: FormValues) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create block");
      setSuccess("Created successfully.");
      reset();
      window.setTimeout(() => {
        router.push("/admin/blocks");
        router.refresh();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create block");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DetailPageShell
      pageTitle="Create room block"
      breadcrumbs={[
        { label: "Blocks", href: "/admin/blocks" },
        { label: "Create block" },
      ]}
      title="Create room block"
      description="Hold inventory for maintenance, private use or manual reservations."
      backAction={{ label: "Back to blocks", href: "/admin/blocks" }}
    >
      <UnsavedChangesGuard dirty={isDirty} />
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
        id="block-create-form"
        className="detail-form-stack"
        onSubmit={handleSubmit(onSubmit)}
      >
        <DetailSectionCard title="Block details">
          <DetailFieldGrid columns={2}>
            <AdminFormField
              label="Room"
              required
              error={errors.roomTypeId?.message}
            >
              <AdminSelect {...register("roomTypeId", { valueAsNumber: true })}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </AdminSelect>
            </AdminFormField>
            <AdminFormField
              label="Reason"
              required
              error={errors.reason?.message}
            >
              <AdminSelect {...register("reason")}>
                <option>Maintenance</option>
                <option>Private use</option>
                <option>Renovation</option>
                <option>Manual reservation</option>
                <option>Other</option>
              </AdminSelect>
            </AdminFormField>
            <AdminFormField
              label="Start"
              required
              error={errors.startDate?.message}
            >
              <AdminTextInput type="date" {...register("startDate")} />
            </AdminFormField>
            <AdminFormField
              label="End"
              required
              error={errors.endDate?.message}
            >
              <AdminTextInput type="date" {...register("endDate")} />
            </AdminFormField>
            <AdminFormField
              label="Rooms blocked"
              required
              error={errors.roomsBlocked?.message}
            >
              <AdminTextInput
                type="number"
                min={1}
                {...register("roomsBlocked", { valueAsNumber: true })}
              />
            </AdminFormField>
            <AdminFormField label="Note" error={errors.adminNote?.message}>
              <AdminTextarea rows={2} {...register("adminNote")} />
            </AdminFormField>
          </DetailFieldGrid>
          <div className="detail-inline-actions">
            <button className="admin-btn" type="submit" disabled={busy}>
              <Save size={16} aria-hidden />
              {busy ? "Saving…" : "Save block"}
            </button>
          </div>
        </DetailSectionCard>
      </form>

      <DetailStickyActionBar
        visible={isDirty && !busy}
        primaryAction={{
          label: "Save block",
          icon: Save,
          onClick: () =>
            (
              document.getElementById("block-create-form") as HTMLFormElement
            )?.requestSubmit(),
          loading: busy,
        }}
        cancelAction={{
          label: "Cancel",
          href: "/admin/blocks",
          variant: "ghost",
        }}
      />
    </DetailPageShell>
  );
}
