"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { toast } from "sonner";
import {
  DetailFieldGrid,
  DetailPageShell,
  DetailSectionCard,
  DetailStickyActionBar,
} from "@/app/admin/components/detail-page";
import {
  AdminFormField,
  AdminSelect,
  AdminTextInput,
  AdminTextarea,
} from "@/app/admin/components/form-fields";
import { todayISODate } from "@/lib/stay-dates";

const schema = z.object({
  bookingId: z.number().min(1, "Select a booking"),
  amount: z.number().positive("Enter a valid amount"),
  currency: z.string().min(1, "Enter a currency"),
  method: z.string().min(1, "Select a method"),
  status: z.string().min(1),
  paymentDate: z.string().optional(),
  transactionReference: z.string().optional(),
  adminNote: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function PaymentCreateForm({
  bookings,
}: {
  bookings: {
    id: number;
    reference: string;
    totalAmount?: number;
    currency?: string;
    paymentStatus?: string;
  }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      bookingId: 0,
      amount: 0,
      currency: "USD",
      method: "Cash",
      status: "Paid",
      paymentDate: todayISODate(),
      transactionReference: "",
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
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          paymentDate:
            values.paymentDate || todayISODate(),
          transactionReference: values.transactionReference || undefined,
          adminNote: values.adminNote || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not record payment");
      toast.success("Created");
      reset();
      window.setTimeout(() => {
        router.push("/admin/payments");
        router.refresh();
      }, 700);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not record payment",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <DetailPageShell
      pageTitle="Record payment"
      breadcrumbs={[
        { label: "Payments", href: "/admin/payments" },
        { label: "Record payment" },
      ]}
      title="Record payment"
      description="Log a manual payment against a booking."
      backAction={{ label: "Back to payments", href: "/admin/payments" }}
    >
      <form
        id="payment-create-form"
        className="detail-form-stack"
        onSubmit={handleSubmit(onSubmit)}
      >
        <DetailSectionCard title="Payment details">
          <DetailFieldGrid columns={2}>
            <AdminFormField
              label="Booking"
              required
              error={errors.bookingId?.message}
            >
              <AdminSelect {...register("bookingId", { valueAsNumber: true })}>
                <option value={0}>Select…</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.reference}
                    {b.totalAmount != null
                      ? ` · ${b.totalAmount} ${b.currency ?? "USD"}`
                      : ""}
                    {b.paymentStatus ? ` (${b.paymentStatus})` : ""}
                  </option>
                ))}
              </AdminSelect>
            </AdminFormField>
            <AdminFormField
              label="Amount"
              required
              error={errors.amount?.message}
            >
              <AdminTextInput
                type="number"
                step="0.01"
                min="0.01"
                {...register("amount", { valueAsNumber: true })}
              />
            </AdminFormField>
            <AdminFormField
              label="Currency"
              required
              error={errors.currency?.message}
            >
              <AdminTextInput {...register("currency")} />
            </AdminFormField>
            <AdminFormField
              label="Method"
              required
              error={errors.method?.message}
            >
              <AdminSelect {...register("method")}>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="EcoCash">EcoCash</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
              </AdminSelect>
            </AdminFormField>
            <AdminFormField label="Status" error={errors.status?.message}>
              <AdminSelect {...register("status")}>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </AdminSelect>
            </AdminFormField>
            <AdminFormField label="Payment date">
              <AdminTextInput type="date" {...register("paymentDate")} />
            </AdminFormField>
            <AdminFormField label="Reference">
              <AdminTextInput {...register("transactionReference")} />
            </AdminFormField>
            <AdminFormField label="Note">
              <AdminTextarea rows={3} {...register("adminNote")} />
            </AdminFormField>
          </DetailFieldGrid>
          <div className="detail-inline-actions">
            <button className="admin-btn" type="submit" disabled={busy}>
              <Save size={16} aria-hidden />
              {busy ? "Saving…" : "Record payment"}
            </button>
          </div>
        </DetailSectionCard>
      </form>

      <DetailStickyActionBar
        visible={isDirty && !busy}
        primaryAction={{
          label: "Record payment",
          icon: Save,
          onClick: () =>
            (
              document.getElementById(
                "payment-create-form",
              ) as HTMLFormElement
            )?.requestSubmit(),
          loading: busy,
        }}
        cancelAction={{
          label: "Cancel",
          href: "/admin/payments",
          variant: "ghost",
        }}
      />
    </DetailPageShell>
  );
}
