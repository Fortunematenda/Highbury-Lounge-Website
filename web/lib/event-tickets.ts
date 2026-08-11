import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  eventTicketOrders,
  eventTicketTypes,
  events,
} from "@/db/schema";
import { getSettingsMap } from "@/lib/settings";
import { createAdminNotification } from "@/lib/admin-notifications";
import { publicSiteUrl, queueNotification } from "@/lib/notifications";

export class TicketError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type TicketTypeInput = {
  id?: number | null;
  name: string;
  description?: string | null;
  currency?: string;
  price: number;
  capacity?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type BankDetails = {
  bankName: string;
  bankBranch: string;
  accountName: string;
  accountUsd: string;
  accountZw: string;
  reservationsEmail: string;
  extraInstructions: string;
};

export const DEFAULT_BANK_DETAILS: BankDetails = {
  bankName: "CBZ Bank",
  bankBranch: "Kadoma Branch",
  accountName: "Highbury Lounge Hotel and Conference Center",
  accountUsd: "61762017990021",
  accountZw: "61762017990011",
  reservationsEmail: "reservationshighburylounge@gmail.com",
  extraInstructions:
    "Use your order reference as the deposit reference. After paying, keep your proof of payment. Tickets are issued once payment is verified.",
};

export async function getBankDetails(): Promise<BankDetails> {
  const map = await getSettingsMap();
  return {
    bankName: map.bank_name || DEFAULT_BANK_DETAILS.bankName,
    bankBranch: map.bank_branch || DEFAULT_BANK_DETAILS.bankBranch,
    accountName: map.bank_account_name || DEFAULT_BANK_DETAILS.accountName,
    accountUsd: map.bank_account_usd || DEFAULT_BANK_DETAILS.accountUsd,
    accountZw: map.bank_account_zw || DEFAULT_BANK_DETAILS.accountZw,
    reservationsEmail:
      map.reservations_email || DEFAULT_BANK_DETAILS.reservationsEmail,
    extraInstructions:
      map.ticket_payment_instructions ||
      DEFAULT_BANK_DETAILS.extraInstructions,
  };
}

function randomCode(length = 4) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function uniqueTicketReference(): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 8; attempt++) {
    const reference = `HL-${randomCode(6)}`;
    const [existing] = await db
      .select({ id: eventTicketOrders.id })
      .from(eventTicketOrders)
      .where(eq(eventTicketOrders.reference, reference))
      .limit(1);
    if (!existing) return reference;
  }
  return `HL-${Date.now().toString(36).toUpperCase()}`;
}

/** Normalize pasted refs: spaces, fancy dashes, missing HL- prefix. */
export function normalizeTicketReference(raw: string) {
  let value = raw
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, "");
  if (!value) return "";
  if (value.startsWith("TKT-")) return value;
  if (/^HL[A-Z0-9]/.test(value) && !value.startsWith("HL-")) {
    value = `HL-${value.slice(2)}`;
  } else if (!value.startsWith("HL-") && /^[A-Z0-9]{5,12}$/.test(value)) {
    value = `HL-${value}`;
  }
  return value;
}

export async function listTicketTypesForEvent(eventId: number, activeOnly = true) {
  const db = getDb();
  const rows = await db
    .select()
    .from(eventTicketTypes)
    .where(
      activeOnly
        ? and(
            eq(eventTicketTypes.eventId, eventId),
            eq(eventTicketTypes.isActive, true),
          )
        : eq(eventTicketTypes.eventId, eventId),
    )
    .orderBy(asc(eventTicketTypes.sortOrder), asc(eventTicketTypes.id));
  return rows;
}

export async function replaceTicketTypes(
  eventId: number,
  types: TicketTypeInput[],
) {
  const db = getDb();
  const cleaned = types
    .map((t, index) => ({
      id: t.id && Number.isFinite(t.id) ? Number(t.id) : null,
      name: String(t.name || "").trim(),
      description: t.description?.trim() || null,
      currency: (t.currency || "USD").trim() || "USD",
      price: Number(t.price),
      capacity:
        t.capacity == null || t.capacity === ("" as unknown)
          ? null
          : Number(t.capacity),
      sortOrder: t.sortOrder ?? index,
      isActive: t.isActive !== false,
    }))
    .filter((t) => t.name && Number.isFinite(t.price) && t.price >= 0);

  const existing = await db
    .select()
    .from(eventTicketTypes)
    .where(eq(eventTicketTypes.eventId, eventId));
  const keepIds = new Set(
    cleaned.map((t) => t.id).filter((id): id is number => id != null),
  );

  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      await db
        .update(eventTicketTypes)
        .set({ isActive: false, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(eventTicketTypes.id, row.id));
    }
  }

  for (const item of cleaned) {
    if (item.id) {
      await db
        .update(eventTicketTypes)
        .set({
          name: item.name,
          description: item.description,
          currency: item.currency,
          price: item.price,
          capacity: item.capacity,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(eventTicketTypes.id, item.id),
            eq(eventTicketTypes.eventId, eventId),
          ),
        );
    } else {
      await db.insert(eventTicketTypes).values({
        eventId,
        name: item.name,
        description: item.description,
        currency: item.currency,
        price: item.price,
        capacity: item.capacity,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      });
    }
  }

  return listTicketTypesForEvent(eventId, false);
}

export async function createTicketOrder(input: {
  eventId: number;
  ticketTypeId: number;
  fullName: string;
  email: string;
  phone: string;
  quantity: number;
}) {
  const db = getDb();
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const quantity = Math.floor(Number(input.quantity) || 0);

  if (!fullName) throw new TicketError("Enter your full name.");
  if (!email || !email.includes("@")) throw new TicketError("Enter a valid email.");
  if (!phone) throw new TicketError("Enter a phone number.");
  if (quantity < 1 || quantity > 20) {
    throw new TicketError("Choose between 1 and 20 tickets.");
  }

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, input.eventId), sql`${events.deletedAt} is null`))
    .limit(1);
  if (!event || event.status !== "published") {
    throw new TicketError("This event is not available.", 404);
  }
  if (event.actionType !== "book_tickets") {
    throw new TicketError("Online ticket sales are not enabled for this event.");
  }

  const [ticketType] = await db
    .select()
    .from(eventTicketTypes)
    .where(
      and(
        eq(eventTicketTypes.id, input.ticketTypeId),
        eq(eventTicketTypes.eventId, input.eventId),
        eq(eventTicketTypes.isActive, true),
      ),
    )
    .limit(1);
  if (!ticketType) throw new TicketError("Select a valid ticket type.");

  if (ticketType.capacity != null) {
    const [{ sold }] = await db
      .select({
        sold: sql<number>`coalesce(sum(${eventTicketOrders.quantity}), 0)`.mapWith(
          Number,
        ),
      })
      .from(eventTicketOrders)
      .where(
        and(
          eq(eventTicketOrders.ticketTypeId, ticketType.id),
          inArray(eventTicketOrders.paymentStatus, ["pending", "paid"]),
        ),
      );
    if (sold + quantity > ticketType.capacity) {
      throw new TicketError("Not enough tickets left for this type.");
    }
  }

  const reference = await uniqueTicketReference();
  const unitPrice = Number(ticketType.price);
  const totalAmount = unitPrice * quantity;

  const [order] = await db
    .insert(eventTicketOrders)
    .values({
      reference,
      eventId: event.id,
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      fullName,
      email,
      phone,
      quantity,
      unitPrice,
      totalAmount,
      currency: ticketType.currency || event.currency || "USD",
      paymentStatus: "pending",
      paymentMethod: "bank_transfer",
    })
    .returning();

  await createAdminNotification({
    type: "event.ticket_order",
    title: "New ticket order",
    message: `${fullName} ordered ${quantity}× ${ticketType.name} for ${event.title} (${reference}).`,
    entityType: "event_ticket_order",
    entityId: order.id,
    actionUrl: `/admin/events/tickets/${order.id}`,
  }).catch(() => undefined);

  const bank = await getBankDetails();
  await queueTicketOrderEmail({
    order,
    eventTitle: event.title,
    eventStartAt: event.startAt,
    bank,
    templateKey: "ticket_order_received",
  }).catch(() => undefined);

  return { order, event, ticketType, bank };
}

function formatBankInstructions(bank: BankDetails) {
  return [
    `Bank: ${bank.bankName}`,
    `Account name: ${bank.accountName}`,
    `Branch: ${bank.bankBranch}`,
    `USD account: ${bank.accountUsd}`,
    `ZW account: ${bank.accountZw}`,
    bank.extraInstructions,
    bank.reservationsEmail
      ? `Proof of payment: ${bank.reservationsEmail}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function ticketOrderPublicPath(reference: string) {
  return `/events/tickets/${reference}`;
}

export function ticketOrderPublicUrl(reference: string) {
  return `${publicSiteUrl()}${ticketOrderPublicPath(reference)}`;
}

async function queueTicketOrderEmail(params: {
  order: typeof eventTicketOrders.$inferSelect;
  eventTitle: string;
  eventStartAt: string;
  bank?: BankDetails;
  templateKey:
    | "ticket_order_received"
    | "ticket_issued"
    | "ticket_order_reminder";
}) {
  const { order, eventTitle, eventStartAt, bank, templateKey } = params;
  await queueNotification({
    templateKey,
    recipientEmail: order.email,
    recipientName: order.fullName,
    relatedType: "event_ticket_order",
    relatedId: order.id,
    context: {
      guestName: order.fullName,
      reference: order.reference,
      eventTitle,
      eventDate: eventStartAt.slice(0, 10),
      guestCount: String(order.quantity),
      ticketType: order.ticketTypeName,
      total: `${order.currency} ${Number(order.totalAmount).toFixed(2)}`,
      status: order.paymentStatus,
      ticketCode: order.ticketCode || undefined,
      ticketUrl: ticketOrderPublicUrl(order.reference),
      paymentInstructions: bank ? formatBankInstructions(bank) : undefined,
    },
  });
}

export async function getTicketOrderByReference(reference: string) {
  const db = getDb();
  const normalized = normalizeTicketReference(reference);
  const [order] = await db
    .select()
    .from(eventTicketOrders)
    .where(eq(eventTicketOrders.reference, normalized))
    .limit(1);
  if (!order) return null;
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, order.eventId))
    .limit(1);
  const bank = await getBankDetails();
  return { order, event, bank };
}

export async function getTicketOrderById(id: number) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(eventTicketOrders)
    .where(eq(eventTicketOrders.id, id))
    .limit(1);
  if (!order) return null;
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, order.eventId))
    .limit(1);
  return { order, event };
}

export async function listTicketOrders(filters?: {
  eventId?: number;
  status?: string;
}) {
  const db = getDb();
  const conditions = [];
  if (filters?.eventId) {
    conditions.push(eq(eventTicketOrders.eventId, filters.eventId));
  }
  if (filters?.status) {
    conditions.push(eq(eventTicketOrders.paymentStatus, filters.status));
  }
  const rows = await db
    .select({
      order: eventTicketOrders,
      eventTitle: events.title,
      eventSlug: events.slug,
      eventStartAt: events.startAt,
    })
    .from(eventTicketOrders)
    .leftJoin(events, eq(events.id, eventTicketOrders.eventId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(eventTicketOrders.createdAt));
  return rows;
}

export async function verifyTicketOrder(
  id: number,
  adminUserId: number,
  notes?: string,
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(eventTicketOrders)
    .where(eq(eventTicketOrders.id, id))
    .limit(1);
  if (!existing) throw new TicketError("Order not found.", 404);
  if (existing.paymentStatus === "cancelled") {
    throw new TicketError("Cancelled orders cannot be verified.");
  }

  const ticketCode =
    existing.ticketCode ||
    `TKT-${existing.reference.replace(/^HL-/, "")}-${randomCode(3)}`;

  const [order] = await db
    .update(eventTicketOrders)
    .set({
      paymentStatus: "paid",
      ticketCode,
      verifiedAt: new Date().toISOString(),
      verifiedBy: adminUserId,
      adminNotes: notes?.trim() || existing.adminNotes,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(eventTicketOrders.id, id))
    .returning();

  const [event] = await db
    .select({ title: events.title, startAt: events.startAt })
    .from(events)
    .where(eq(events.id, order.eventId))
    .limit(1);

  if (event) {
    await queueTicketOrderEmail({
      order,
      eventTitle: event.title,
      eventStartAt: event.startAt,
      templateKey: "ticket_issued",
    }).catch(() => undefined);
  }

  return order;
}

function phoneMatches(storedRaw: string, inputRaw: string) {
  const stored = storedRaw.replace(/\D/g, "");
  const digits = inputRaw.replace(/\D/g, "");
  if (digits.length >= 7 && stored.includes(digits)) return true;
  if (digits.length >= 7 && digits.includes(stored) && stored.length >= 7) {
    return true;
  }
  return storedRaw.trim() === inputRaw.trim();
}

export async function lookupTicketOrders(input: {
  email: string;
  reference?: string;
  phone?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const reference = normalizeTicketReference(input.reference || "");
  const phone = input.phone?.trim() || "";

  if (!email || !email.includes("@")) {
    throw new TicketError("Enter the email used for the order.");
  }
  if (!reference && !phone) {
    throw new TicketError("Enter your order reference or phone number.");
  }

  const db = getDb();

  // Reference is unique — prefer it and do not also require phone
  // (autofilled/wrong phone was hiding valid matches).
  if (reference) {
    const [byRef] = await db
      .select({
        order: eventTicketOrders,
        eventTitle: events.title,
        eventStartAt: events.startAt,
      })
      .from(eventTicketOrders)
      .leftJoin(events, eq(events.id, eventTicketOrders.eventId))
      .where(
        sql`upper(${eventTicketOrders.reference}) = ${reference}
            OR upper(coalesce(${eventTicketOrders.ticketCode}, '')) = ${reference}`,
      )
      .limit(1);

    if (!byRef) {
      return [];
    }

    if (byRef.order.email.trim().toLowerCase() !== email) {
      throw new TicketError(
        "That reference exists, but the email does not match the order. Use the same email you entered when buying, or contact Highbury Lounge.",
      );
    }

    return [byRef];
  }

  const rows = await db
    .select({
      order: eventTicketOrders,
      eventTitle: events.title,
      eventStartAt: events.startAt,
    })
    .from(eventTicketOrders)
    .leftJoin(events, eq(events.id, eventTicketOrders.eventId))
    .where(sql`lower(${eventTicketOrders.email}) = ${email}`)
    .orderBy(desc(eventTicketOrders.createdAt))
    .limit(40);

  return rows
    .filter((row) => phoneMatches(row.order.phone, phone))
    .slice(0, 10);
}

export async function resendTicketOrderLink(orderId: number) {
  const result = await getTicketOrderById(orderId);
  if (!result?.order || !result.event) {
    throw new TicketError("Order not found.", 404);
  }
  if (result.order.paymentStatus === "cancelled") {
    throw new TicketError("This order was cancelled.");
  }

  const bank =
    result.order.paymentStatus === "pending"
      ? await getBankDetails()
      : undefined;

  await queueTicketOrderEmail({
    order: result.order,
    eventTitle: result.event.title,
    eventStartAt: result.event.startAt,
    bank,
    templateKey:
      result.order.paymentStatus === "paid"
        ? "ticket_issued"
        : "ticket_order_reminder",
  });

  return result.order;
}

export async function cancelTicketOrder(id: number, notes?: string) {
  const db = getDb();
  const [order] = await db
    .update(eventTicketOrders)
    .set({
      paymentStatus: "cancelled",
      adminNotes: notes?.trim() || null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(eventTicketOrders.id, id))
    .returning();
  if (!order) throw new TicketError("Order not found.", 404);
  return order;
}

export async function deleteTicketOrder(id: number) {
  const db = getDb();
  const [existing] = await db
    .select({
      id: eventTicketOrders.id,
      reference: eventTicketOrders.reference,
    })
    .from(eventTicketOrders)
    .where(eq(eventTicketOrders.id, id))
    .limit(1);
  if (!existing) throw new TicketError("Order not found.", 404);

  await db.delete(eventTicketOrders).where(eq(eventTicketOrders.id, id));
  return existing;
}
