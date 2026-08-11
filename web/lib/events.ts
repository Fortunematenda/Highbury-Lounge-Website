import { and, asc, desc, eq, gte, inArray, isNull, like, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { eventReservations, events, eventSubscribers } from "@/db/schema";
import { createAdminNotification } from "@/lib/admin-notifications";
import {
  ACTION_TYPES,
  CAPACITY_COUNTING_STATUSES,
  DEFAULT_TIMEZONE,
  DEFAULT_VENUE_ADDRESS,
  DEFAULT_VENUE_NAME,
  ENTRY_TYPES,
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  availabilityLabel,
  formatEntryPrice,
  isActionType,
  isEntryType,
  isEventCategory,
  isEventStatus,
  isReservationStatus,
  type ActionType,
  type EntryType,
  type EventCategory,
  type EventStatus,
  type ReservationStatus,
} from "@/lib/event-constants";
import { formatMoney } from "@/lib/format";
import { queueNotification } from "@/lib/notifications";
import { slugify } from "@/lib/slug";
import { nowVenueIso, todayVenueStartIso, toVenueWallClock } from "@/lib/timezone";

export {
  ACTION_TYPES,
  ENTRY_TYPES,
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  actionLabel,
  availabilityLabel,
  formatEntryPrice,
  isActionType,
  isEntryType,
  isEventCategory,
  isEventStatus,
  isReservationStatus,
} from "@/lib/event-constants";

export type EventRow = typeof events.$inferSelect;

export class EventError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function nowIsoLocal() {
  return nowVenueIso();
}

function todayStartIso() {
  return todayVenueStartIso();
}

function parseGallery(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function parseProgramme(
  json: string | null | undefined,
): Array<{ time: string; title: string; detail?: string }> {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const time = String(row.time ?? "").trim();
        const title = String(row.title ?? "").trim();
        if (!time || !title) return null;
        return {
          time,
          title,
          detail: row.detail ? String(row.detail) : undefined,
        };
      })
      .filter(Boolean) as Array<{ time: string; title: string; detail?: string }>;
  } catch {
    return [];
  }
}

async function uniqueSlug(base: string, excludeId?: number) {
  const db = getDb();
  let slug = slugify(base) || `event-${Date.now()}`;
  let i = 0;
  while (true) {
    const candidate = i === 0 ? slug : `${slug}-${i}`;
    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.slug, candidate), isNull(events.deletedAt)))
      .limit(1);
    if (!existing || existing.id === excludeId) return candidate;
    i += 1;
    if (i > 50) return `${slug}-${Date.now()}`;
  }
}

export async function countReservedGuests(eventId: number) {
  const db = getDb();
  const [row] = await db
    .select({
      value: sql<number>`coalesce(sum(${eventReservations.guestCount}), 0)`.mapWith(Number),
    })
    .from(eventReservations)
    .where(
      and(
        eq(eventReservations.eventId, eventId),
        inArray(eventReservations.status, CAPACITY_COUNTING_STATUSES),
      ),
    );
  return Number(row?.value ?? 0);
}

/** Mirrors ticket types returned with public events. */
export type PublicTicketType = {
  id: number;
  name: string;
  description: string | null;
  currency: string;
  price: number;
};

export function toPublicEvent(
  event: EventRow,
  reservedGuests = 0,
) {
  const availability = availabilityLabel({
    status: event.status,
    soldOutOverride: event.soldOutOverride,
    trackCapacity: event.trackCapacity,
    capacity: event.capacity,
    reservedGuests,
    limitedSpaceThreshold: event.limitedSpaceThreshold,
  });
  const remaining =
    event.trackCapacity && event.capacity != null
      ? Math.max(0, event.capacity - reservedGuests)
      : null;

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    shortDescription: event.shortDescription,
    description: event.description,
    category: event.category,
    artistOrHost: event.artistOrHost,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    startAt: toVenueWallClock(event.startAt),
    endAt: event.endAt ? toVenueWallClock(event.endAt) : null,
    timezone: event.timezone,
    coverImage: event.coverImage,
    posterImage: event.posterImage,
    gallery: parseGallery(event.galleryJson),
    entryType: event.entryType,
    currency: event.currency,
    price: event.price,
    priceLabel: formatEntryPrice({
      entryType: event.entryType,
      price: event.price,
      currency: event.currency,
      formatMoney,
    }),
    capacity: event.trackCapacity ? event.capacity : null,
    remaining,
    trackCapacity: event.trackCapacity,
    actionType: event.actionType,
    customActionLabel: event.customActionLabel,
    externalBookingUrl: event.externalBookingUrl,
    enableOnlineReservations: event.enableOnlineReservations,
    minGuests: event.minGuests,
    maxGuestsPerReservation: event.maxGuestsPerReservation,
    programme: parseProgramme(event.programmeJson),
    dressCode: event.dressCode,
    ageNote: event.ageNote,
    attendanceInfo: event.attendanceInfo,
    status: event.status,
    isFeatured: event.isFeatured,
    showAnnouncement: event.showAnnouncement,
    availability,
    canBuyTickets:
      event.status === "published" &&
      availability !== "Sold Out" &&
      availability !== "Cancelled" &&
      event.actionType === "book_tickets" &&
      event.startAt >= todayStartIso(),
    canReserve:
      event.status === "published" &&
      availability !== "Sold Out" &&
      availability !== "Cancelled" &&
      event.enableOnlineReservations &&
      event.actionType !== "none" &&
      event.actionType !== "whatsapp" &&
      event.actionType !== "external" &&
      event.actionType !== "book_tickets" &&
      event.startAt >= todayStartIso(),
    ticketTypes: [] as PublicTicketType[],
    seoTitle: event.seoTitle,
    seoDescription: event.seoDescription,
    socialImage: event.socialImage || event.posterImage || event.coverImage,
  };
}

async function withTicketTypes<T extends ReturnType<typeof toPublicEvent>>(
  row: { id: number; actionType: string },
  base: T,
): Promise<T & { ticketTypes: PublicTicketType[] }> {
  if (row.actionType !== "book_tickets") {
    return { ...base, ticketTypes: [] };
  }
  const { listTicketTypesForEvent } = await import("@/lib/event-tickets");
  const types = await listTicketTypesForEvent(row.id, true);
  return {
    ...base,
    ticketTypes: types.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      currency: t.currency,
      price: t.price,
    })),
  };
}

export async function listPublishedUpcoming(params?: {
  q?: string;
  category?: string;
  freeOnly?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const now = todayStartIso();
  const filters = [
    isNull(events.deletedAt),
    inArray(events.status, ["published", "postponed"]),
    gte(events.startAt, now),
  ];

  if (params?.category && isEventCategory(params.category)) {
    filters.push(eq(events.category, params.category));
  }
  if (params?.freeOnly) {
    filters.push(eq(events.entryType, "free"));
  }
  if (params?.from) {
    filters.push(gte(events.startAt, `${params.from}T00:00:00`));
  }
  if (params?.to) {
    filters.push(lte(events.startAt, `${params.to}T23:59:59`));
  }
  if (params?.q?.trim()) {
    const pattern = `%${params.q.trim()}%`;
    filters.push(
      or(
        like(events.title, pattern),
        like(events.artistOrHost, pattern),
        like(events.shortDescription, pattern),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(events)
    .where(and(...filters))
    .orderBy(asc(events.startAt))
    .limit(params?.limit ?? 50)
    .offset(params?.offset ?? 0);

  return Promise.all(
    rows.map(async (row) =>
      withTicketTypes(row, toPublicEvent(row, await countReservedGuests(row.id))),
    ),
  );
}

export async function listPublishedPast(params?: {
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const now = todayStartIso();
  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        isNull(events.deletedAt),
        inArray(events.status, ["published", "completed", "postponed"]),
        lte(events.startAt, now),
      ),
    )
    .orderBy(desc(events.startAt))
    .limit(params?.limit ?? 6)
    .offset(params?.offset ?? 0);

  return Promise.all(
    rows.map(async (row) =>
      withTicketTypes(row, toPublicEvent(row, await countReservedGuests(row.id))),
    ),
  );
}

export async function getFeaturedUpcoming() {
  const db = getDb();
  const now = todayStartIso();
  const [row] = await db
    .select()
    .from(events)
    .where(
      and(
        isNull(events.deletedAt),
        eq(events.status, "published"),
        eq(events.isFeatured, true),
        gte(events.startAt, now),
      ),
    )
    .orderBy(asc(events.startAt))
    .limit(1);
  if (!row) return null;
  return withTicketTypes(
    row,
    toPublicEvent(row, await countReservedGuests(row.id)),
  );
}

export async function getAnnouncementEvent() {
  const db = getDb();
  const now = todayStartIso();
  const [row] = await db
    .select()
    .from(events)
    .where(
      and(
        isNull(events.deletedAt),
        eq(events.status, "published"),
        eq(events.showAnnouncement, true),
        gte(events.startAt, now),
      ),
    )
    .orderBy(asc(events.startAt))
    .limit(1);
  if (!row) return null;
  return withTicketTypes(
    row,
    toPublicEvent(row, await countReservedGuests(row.id)),
  );
}

export async function getPublishedEventBySlug(slug: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.slug, slug),
        isNull(events.deletedAt),
        inArray(events.status, [
          "published",
          "postponed",
          "cancelled",
          "completed",
        ]),
      ),
    )
    .limit(1);
  if (!row) return null;
  return withTicketTypes(
    row,
    toPublicEvent(row, await countReservedGuests(row.id)),
  );
}

export async function getRelatedEvents(eventId: number, category: string) {
  const db = getDb();
  const now = todayStartIso();
  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        isNull(events.deletedAt),
        eq(events.status, "published"),
        eq(events.category, category),
        gte(events.startAt, now),
        sql`${events.id} != ${eventId}`,
      ),
    )
    .orderBy(asc(events.startAt))
    .limit(3);

  if (rows.length >= 3) {
    return Promise.all(
      rows.map(async (row) =>
        withTicketTypes(row, toPublicEvent(row, await countReservedGuests(row.id))),
      ),
    );
  }

  const extra = await db
    .select()
    .from(events)
    .where(
      and(
        isNull(events.deletedAt),
        eq(events.status, "published"),
        gte(events.startAt, now),
        sql`${events.id} != ${eventId}`,
        rows.length
          ? sql`${events.id} not in (${sql.join(
              rows.map((r) => sql`${r.id}`),
              sql`, `,
            )})`
          : sql`1=1`,
      ),
    )
    .orderBy(asc(events.startAt))
    .limit(3 - rows.length);

  const combined = [...rows, ...extra];
  return Promise.all(
    combined.map(async (row) =>
      withTicketTypes(row, toPublicEvent(row, await countReservedGuests(row.id))),
    ),
  );
}

export type EventInput = {
  title: string;
  slug?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  category?: string;
  tags?: string[] | null;
  artistOrHost?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  startAt: string;
  endAt?: string | null;
  timezone?: string | null;
  coverImage?: string | null;
  posterImage?: string | null;
  gallery?: string[] | null;
  entryType?: string;
  currency?: string | null;
  price?: number | null;
  capacity?: number | null;
  trackCapacity?: boolean;
  soldOutOverride?: boolean;
  limitedSpaceThreshold?: number | null;
  actionType?: string;
  customActionLabel?: string | null;
  externalBookingUrl?: string | null;
  enableOnlineReservations?: boolean;
  minGuests?: number;
  maxGuestsPerReservation?: number;
  reservationDeadline?: string | null;
  requireApproval?: boolean;
  programme?: Array<{ time: string; title: string; detail?: string }> | null;
  dressCode?: string | null;
  ageNote?: string | null;
  attendanceInfo?: string | null;
  status?: string;
  isFeatured?: boolean;
  showAnnouncement?: boolean;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  socialImage?: string | null;
  ticketTypes?: Array<{
    id?: number | null;
    name: string;
    description?: string | null;
    currency?: string;
    price: number;
    capacity?: number | null;
    sortOrder?: number;
    isActive?: boolean;
  }> | null;
};

function normalizeInput(input: EventInput, existing?: EventRow) {
  const title = input.title?.trim();
  if (!title) throw new EventError("Event title is required.");
  const startAt = toVenueWallClock(input.startAt?.trim());
  if (!startAt) throw new EventError("Start date and time are required.");

  const category = input.category ?? existing?.category ?? "Other";
  if (!isEventCategory(category)) throw new EventError("Invalid category.");

  const entryType = (input.entryType ?? existing?.entryType ?? "contact") as string;
  if (!isEntryType(entryType)) throw new EventError("Invalid entry type.");

  const actionType = (input.actionType ??
    existing?.actionType ??
    "reserve_table") as string;
  if (!isActionType(actionType)) throw new EventError("Invalid action type.");

  const status = (input.status ?? existing?.status ?? "draft") as string;
  if (!isEventStatus(status)) throw new EventError("Invalid status.");

  const price =
    entryType === "free" || entryType === "contact"
      ? null
      : input.price != null
        ? Number(input.price)
        : existing?.price ?? null;

  return {
    title,
    shortDescription: input.shortDescription?.trim() || null,
    description: input.description?.trim() || null,
    category: category as EventCategory,
    tagsJson: input.tags ? JSON.stringify(input.tags) : existing?.tagsJson ?? null,
    artistOrHost: input.artistOrHost?.trim() || null,
    venueName: input.venueName?.trim() || DEFAULT_VENUE_NAME,
    venueAddress: input.venueAddress?.trim() || DEFAULT_VENUE_ADDRESS,
    startAt,
    endAt: input.endAt?.trim() ? toVenueWallClock(input.endAt.trim()) : null,
    timezone: input.timezone?.trim() || DEFAULT_TIMEZONE,
    coverImage: input.coverImage ?? existing?.coverImage ?? null,
    posterImage: input.posterImage ?? existing?.posterImage ?? null,
    galleryJson: input.gallery
      ? JSON.stringify(input.gallery)
      : existing?.galleryJson ?? null,
    entryType: entryType as EntryType,
    currency: input.currency?.trim() || existing?.currency || "USD",
    price,
    capacity:
      input.capacity != null
        ? Number(input.capacity)
        : existing?.capacity ?? null,
    trackCapacity: Boolean(
      input.trackCapacity ?? existing?.trackCapacity ?? false,
    ),
    soldOutOverride: Boolean(
      input.soldOutOverride ?? existing?.soldOutOverride ?? false,
    ),
    limitedSpaceThreshold:
      input.limitedSpaceThreshold != null
        ? Number(input.limitedSpaceThreshold)
        : existing?.limitedSpaceThreshold ?? 10,
    actionType: actionType as ActionType,
    customActionLabel: input.customActionLabel?.trim() || null,
    externalBookingUrl: input.externalBookingUrl?.trim() || null,
    enableOnlineReservations: Boolean(
      input.enableOnlineReservations ??
        existing?.enableOnlineReservations ??
        true,
    ),
    minGuests: Math.max(1, Number(input.minGuests ?? existing?.minGuests ?? 1)),
    maxGuestsPerReservation: Math.max(
      1,
      Number(
        input.maxGuestsPerReservation ??
          existing?.maxGuestsPerReservation ??
          10,
      ),
    ),
    reservationDeadline: input.reservationDeadline?.trim()
      ? toVenueWallClock(input.reservationDeadline.trim())
      : null,
    requireApproval: Boolean(
      input.requireApproval ?? existing?.requireApproval ?? true,
    ),
    programmeJson: input.programme
      ? JSON.stringify(input.programme)
      : existing?.programmeJson ?? null,
    dressCode: input.dressCode?.trim() || null,
    ageNote: input.ageNote?.trim() || null,
    attendanceInfo: input.attendanceInfo?.trim() || null,
    status: status as EventStatus,
    isFeatured: Boolean(input.isFeatured ?? existing?.isFeatured ?? false),
    showAnnouncement: Boolean(
      input.showAnnouncement ?? existing?.showAnnouncement ?? false,
    ),
    publishedAt:
      status === "published"
        ? input.publishedAt || existing?.publishedAt || nowIsoLocal()
        : existing?.publishedAt ?? null,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    socialImage: input.socialImage?.trim() || null,
  };
}

export async function createEvent(input: EventInput) {
  const db = getDb();
  const data = normalizeInput(input);
  const slug = await uniqueSlug(input.slug?.trim() || data.title);

  if (data.isFeatured) {
    await db
      .update(events)
      .set({ isFeatured: false, updatedAt: nowIsoLocal() })
      .where(eq(events.isFeatured, true));
  }

  const [row] = await db
    .insert(events)
    .values({ ...data, slug })
    .returning();

  if (input.ticketTypes && input.ticketTypes.length > 0) {
    const { replaceTicketTypes } = await import("@/lib/event-tickets");
    await replaceTicketTypes(row.id, input.ticketTypes);
  }

  return row;
}

export async function updateEvent(id: number, input: Partial<EventInput>) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), isNull(events.deletedAt)))
    .limit(1);
  if (!existing) throw new EventError("Event not found.", 404);

  const merged: EventInput = {
    title: input.title ?? existing.title,
    slug: input.slug ?? existing.slug,
    shortDescription:
      input.shortDescription !== undefined
        ? input.shortDescription
        : existing.shortDescription,
    description:
      input.description !== undefined ? input.description : existing.description,
    category: input.category ?? existing.category,
    artistOrHost:
      input.artistOrHost !== undefined
        ? input.artistOrHost
        : existing.artistOrHost,
    venueName: input.venueName ?? existing.venueName,
    venueAddress: input.venueAddress ?? existing.venueAddress,
    startAt: input.startAt ?? existing.startAt,
    endAt: input.endAt !== undefined ? input.endAt : existing.endAt,
    timezone: input.timezone ?? existing.timezone,
    coverImage:
      input.coverImage !== undefined ? input.coverImage : existing.coverImage,
    posterImage:
      input.posterImage !== undefined ? input.posterImage : existing.posterImage,
    gallery: input.gallery,
    entryType: input.entryType ?? existing.entryType,
    currency: input.currency ?? existing.currency,
    price: input.price !== undefined ? input.price : existing.price,
    capacity: input.capacity !== undefined ? input.capacity : existing.capacity,
    trackCapacity: input.trackCapacity ?? existing.trackCapacity,
    soldOutOverride: input.soldOutOverride ?? existing.soldOutOverride,
    limitedSpaceThreshold:
      input.limitedSpaceThreshold !== undefined
        ? input.limitedSpaceThreshold
        : existing.limitedSpaceThreshold,
    actionType: input.actionType ?? existing.actionType,
    customActionLabel:
      input.customActionLabel !== undefined
        ? input.customActionLabel
        : existing.customActionLabel,
    externalBookingUrl:
      input.externalBookingUrl !== undefined
        ? input.externalBookingUrl
        : existing.externalBookingUrl,
    enableOnlineReservations:
      input.enableOnlineReservations ?? existing.enableOnlineReservations,
    minGuests: input.minGuests ?? existing.minGuests,
    maxGuestsPerReservation:
      input.maxGuestsPerReservation ?? existing.maxGuestsPerReservation,
    reservationDeadline:
      input.reservationDeadline !== undefined
        ? input.reservationDeadline
        : existing.reservationDeadline,
    requireApproval: input.requireApproval ?? existing.requireApproval,
    programme: input.programme,
    dressCode:
      input.dressCode !== undefined ? input.dressCode : existing.dressCode,
    ageNote: input.ageNote !== undefined ? input.ageNote : existing.ageNote,
    attendanceInfo:
      input.attendanceInfo !== undefined
        ? input.attendanceInfo
        : existing.attendanceInfo,
    status: input.status ?? existing.status,
    isFeatured: input.isFeatured ?? existing.isFeatured,
    showAnnouncement: input.showAnnouncement ?? existing.showAnnouncement,
    publishedAt:
      input.publishedAt !== undefined
        ? input.publishedAt
        : existing.publishedAt,
    seoTitle: input.seoTitle !== undefined ? input.seoTitle : existing.seoTitle,
    seoDescription:
      input.seoDescription !== undefined
        ? input.seoDescription
        : existing.seoDescription,
    socialImage:
      input.socialImage !== undefined ? input.socialImage : existing.socialImage,
  };

  const data = normalizeInput(merged, existing);
  const slug = await uniqueSlug(
    input.slug?.trim() || existing.slug || data.title,
    id,
  );

  if (data.isFeatured && !existing.isFeatured) {
    await db
      .update(events)
      .set({ isFeatured: false, updatedAt: nowIsoLocal() })
      .where(and(eq(events.isFeatured, true), sql`${events.id} != ${id}`));
  }

  const [row] = await db
    .update(events)
    .set({ ...data, slug, updatedAt: nowIsoLocal() })
    .where(eq(events.id, id))
    .returning();

  if (input.ticketTypes) {
    const { replaceTicketTypes } = await import("@/lib/event-tickets");
    await replaceTicketTypes(id, input.ticketTypes);
  }

  return row;
}

export async function softDeleteEvent(id: number) {
  const db = getDb();
  const [row] = await db
    .update(events)
    .set({
      deletedAt: nowIsoLocal(),
      status: "cancelled",
      isFeatured: false,
      showAnnouncement: false,
      updatedAt: nowIsoLocal(),
    })
    .where(and(eq(events.id, id), isNull(events.deletedAt)))
    .returning();
  if (!row) throw new EventError("Event not found.", 404);
  return row;
}

export async function duplicateEvent(id: number) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), isNull(events.deletedAt)))
    .limit(1);
  if (!existing) throw new EventError("Event not found.", 404);

  return createEvent({
    title: `${existing.title} (Copy)`,
    shortDescription: existing.shortDescription,
    description: existing.description,
    category: existing.category,
    artistOrHost: existing.artistOrHost,
    venueName: existing.venueName,
    venueAddress: existing.venueAddress,
    startAt: existing.startAt,
    endAt: existing.endAt,
    timezone: existing.timezone,
    coverImage: existing.coverImage,
    posterImage: existing.posterImage,
    gallery: parseGallery(existing.galleryJson),
    entryType: existing.entryType,
    currency: existing.currency,
    price: existing.price,
    capacity: existing.capacity,
    trackCapacity: existing.trackCapacity,
    soldOutOverride: false,
    limitedSpaceThreshold: existing.limitedSpaceThreshold,
    actionType: existing.actionType,
    customActionLabel: existing.customActionLabel,
    externalBookingUrl: existing.externalBookingUrl,
    enableOnlineReservations: existing.enableOnlineReservations,
    minGuests: existing.minGuests,
    maxGuestsPerReservation: existing.maxGuestsPerReservation,
    reservationDeadline: existing.reservationDeadline,
    requireApproval: existing.requireApproval,
    programme: parseProgramme(existing.programmeJson),
    dressCode: existing.dressCode,
    ageNote: existing.ageNote,
    attendanceInfo: existing.attendanceInfo,
    status: "draft",
    isFeatured: false,
    showAnnouncement: false,
    seoTitle: existing.seoTitle,
    seoDescription: existing.seoDescription,
    socialImage: existing.socialImage,
  });
}

function makeReference() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EV-${stamp}-${rand}`;
}

export async function createEventReservation(params: {
  eventId: number;
  fullName: string;
  email: string;
  phone: string;
  guestCount: number;
  reservationType?: string | null;
  seatingRequest?: string | null;
  notes?: string | null;
  consentAccepted: boolean;
}) {
  const db = getDb();
  const fullName = params.fullName.trim();
  const email = params.email.trim().toLowerCase();
  const phone = params.phone.trim();
  const guestCount = Math.floor(Number(params.guestCount));

  if (!fullName || !email || !phone) {
    throw new EventError("Name, email and phone are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new EventError("Enter a valid email address.");
  }
  if (!params.consentAccepted) {
    throw new EventError("Please accept the consent checkbox to continue.");
  }

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, params.eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!event) throw new EventError("Event not found.", 404);
  if (event.status !== "published") {
    throw new EventError("This event is not open for reservations.");
  }
  if (event.startAt < todayStartIso()) {
    throw new EventError("This event has already taken place.");
  }
  if (!event.enableOnlineReservations) {
    throw new EventError("Online reservations are not available for this event.");
  }
  if (
    event.actionType === "none" ||
    event.actionType === "whatsapp" ||
    event.actionType === "external"
  ) {
    throw new EventError("This event does not accept online reservations.");
  }
  if (event.reservationDeadline && event.reservationDeadline < nowIsoLocal()) {
    throw new EventError("The reservation deadline for this event has passed.");
  }
  if (guestCount < event.minGuests || guestCount > event.maxGuestsPerReservation) {
    throw new EventError(
      `Guest count must be between ${event.minGuests} and ${event.maxGuestsPerReservation}.`,
    );
  }

  const reserved = await countReservedGuests(event.id);
  const availability = availabilityLabel({
    status: event.status,
    soldOutOverride: event.soldOutOverride,
    trackCapacity: event.trackCapacity,
    capacity: event.capacity,
    reservedGuests: reserved,
    limitedSpaceThreshold: event.limitedSpaceThreshold,
  });
  if (availability === "Sold Out" || availability === "Cancelled") {
    throw new EventError("This event is no longer available.");
  }
  if (
    event.trackCapacity &&
    event.capacity != null &&
    reserved + guestCount > event.capacity
  ) {
    throw new EventError(
      `Only ${Math.max(0, event.capacity - reserved)} place(s) remaining.`,
    );
  }

  // Prevent duplicate reservations: same email + event with an active status
  const existing = await db
    .select({ id: eventReservations.id })
    .from(eventReservations)
    .where(
      and(
        eq(eventReservations.eventId, event.id),
        eq(eventReservations.email, email),
        inArray(eventReservations.status, ["Pending", "Confirmed", "Attended"]),
      ),
    )
    .limit(1);
  if (existing.length) {
    throw new EventError(
      "You already have a reservation for this event.",
      409,
    );
  }

  const status: ReservationStatus = event.requireApproval
    ? "Pending"
    : "Confirmed";
  const reference = makeReference();

  const [reservation] = await db
    .insert(eventReservations)
    .values({
      reference,
      eventId: event.id,
      fullName,
      email,
      phone,
      guestCount,
      reservationType: params.reservationType?.trim() || null,
      seatingRequest: params.seatingRequest?.trim() || null,
      notes: params.notes?.trim() || null,
      status,
      consentAccepted: true,
    })
    .returning();

  await createAdminNotification({
    type: "event_reservation",
    title: "New event reservation",
    message: `${reference} · ${fullName} · ${event.title} · ${guestCount} guest(s)`,
    entityType: "event_reservation",
    entityId: reservation.id,
    actionUrl: `/admin/events/reservations/${reservation.id}`,
  });

  await queueNotification({
    templateKey: "event_reservation_received",
    recipientEmail: email,
    recipientName: fullName,
    relatedType: "event_reservation",
    relatedId: reservation.id,
    context: {
      guestName: fullName,
      reference,
      eventTitle: event.title,
      eventDate: event.startAt.slice(0, 10),
      guestCount: String(guestCount),
      status,
    },
  });

  return { reservation, event };
}

export async function updateReservationStatus(params: {
  id: number;
  status: string;
  adminNotes?: string | null;
}) {
  if (!isReservationStatus(params.status)) {
    throw new EventError("Invalid reservation status.");
  }
  const db = getDb();
  const [existing] = await db
    .select()
    .from(eventReservations)
    .where(eq(eventReservations.id, params.id))
    .limit(1);
  if (!existing) throw new EventError("Reservation not found.", 404);

  const [row] = await db
    .update(eventReservations)
    .set({
      status: params.status,
      adminNotes:
        params.adminNotes !== undefined
          ? params.adminNotes
          : existing.adminNotes,
      updatedAt: nowIsoLocal(),
    })
    .where(eq(eventReservations.id, params.id))
    .returning();
  return row;
}

export async function subscribeToEvents(emailRaw: string, source = "events_page") {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new EventError("Enter a valid email address.");
  }
  const db = getDb();
  const [existing] = await db
    .select()
    .from(eventSubscribers)
    .where(eq(eventSubscribers.email, email))
    .limit(1);

  if (existing) {
    if (existing.status === "active") {
      return { subscriber: existing, created: false };
    }
    const [row] = await db
      .update(eventSubscribers)
      .set({
        status: "active",
        unsubscribedAt: null,
        source,
        subscribedAt: nowIsoLocal(),
        updatedAt: nowIsoLocal(),
      })
      .where(eq(eventSubscribers.id, existing.id))
      .returning();
    return { subscriber: row, created: false };
  }

  const [row] = await db
    .insert(eventSubscribers)
    .values({ email, status: "active", source })
    .returning();
  return { subscriber: row, created: true };
}
