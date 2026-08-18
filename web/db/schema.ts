import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
};

export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
});

export const adminUsers = sqliteTable(
  "admin_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    lastLoginAt: text("last_login_at"),
    ...timestamps,
  },
  (t) => [index("admin_users_role_idx").on(t.roleId)],
);

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    adminUserId: integer("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    ...timestamps,
  },
  (t) => [index("admin_sessions_user_idx").on(t.adminUserId)],
);

export const amenities = sqliteTable("amenities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  icon: text("icon"),
  ...timestamps,
});

export const roomTypes = sqliteTable(
  "room_types",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    shortDescription: text("short_description"),
    pricePerNight: real("price_per_night").notNull(),
    promotionalPrice: real("promotional_price"),
    inventoryCount: integer("inventory_count").notNull().default(1),
    maxAdults: integer("max_adults").notNull().default(2),
    maxChildren: integer("max_children").notNull().default(0),
    maxGuests: integer("max_guests").notNull().default(2),
    bedType: text("bed_type"),
    roomSize: text("room_size"),
    featuredImage: text("featured_image"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    /** JSON: { en?: {name,description,shortDescription}, "zh-CN"?: {...}, sn?: {...}, nd?: {...} } */
    translationsJson: text("translations_json"),
    ...timestamps,
  },
  (t) => [
    index("room_types_active_idx").on(t.isActive),
    index("room_types_order_idx").on(t.displayOrder),
  ],
);

export const roomImages = sqliteTable(
  "room_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    roomTypeId: integer("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: text("alt_text"),
    displayOrder: integer("display_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("room_images_room_idx").on(t.roomTypeId)],
);

export const roomTypeAmenities = sqliteTable(
  "room_type_amenities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    roomTypeId: integer("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    amenityId: integer("amenity_id")
      .notNull()
      .references(() => amenities.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("room_amenity_unique").on(t.roomTypeId, t.amenityId),
  ],
);

/** Pending | Awaiting Payment | Confirmed | Checked In | Checked Out | Cancelled | Declined | No Show | Expired */
export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reference: text("reference").notNull().unique(),
    roomTypeId: integer("room_type_id")
      .notNull()
      .references(() => roomTypes.id),
    roomsBooked: integer("rooms_booked").notNull().default(1),
    checkIn: text("check_in").notNull(),
    checkOut: text("check_out").notNull(),
    nights: integer("nights").notNull(),
    adults: integer("adults").notNull().default(1),
    children: integer("children").notNull().default(0),
    status: text("status").notNull().default("Pending"),
    currency: text("currency").notNull().default("USD"),
    pricePerNight: real("price_per_night").notNull(),
    subtotal: real("subtotal").notNull(),
    taxAmount: real("tax_amount").notNull().default(0),
    serviceFee: real("service_fee").notNull().default(0),
    extrasTotal: real("extras_total").notNull().default(0),
    totalAmount: real("total_amount").notNull(),
    pricingSnapshotJson: text("pricing_snapshot_json"),
    specialRequests: text("special_requests"),
    estimatedArrival: text("estimated_arrival"),
    termsAccepted: integer("terms_accepted", { mode: "boolean" })
      .notNull()
      .default(false),
    adminNotes: text("admin_notes"),
    paymentStatus: text("payment_status").notNull().default("Unpaid"),
    expiresAt: text("expires_at"),
    source: text("source").default("website"),
    /** Guest UI language: en | zh-CN | sn | nd */
    preferredLanguage: text("preferred_language").default("en"),
    ...timestamps,
  },
  (t) => [
    index("bookings_status_idx").on(t.status),
    index("bookings_dates_idx").on(t.checkIn, t.checkOut),
    index("bookings_room_idx").on(t.roomTypeId),
    index("bookings_created_idx").on(t.createdAt),
    index("bookings_payment_idx").on(t.paymentStatus),
  ],
);

export const bookingGuests = sqliteTable(
  "booking_guests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    whatsapp: text("whatsapp"),
    country: text("country"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("booking_guests_booking_idx").on(t.bookingId),
    index("booking_guests_email_idx").on(t.email),
  ],
);

export const bookingStatusHistory = sqliteTable(
  "booking_status_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    previousStatus: text("previous_status"),
    newStatus: text("new_status").notNull(),
    adminUserId: integer("admin_user_id").references(() => adminUsers.id),
    note: text("note"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("booking_status_history_booking_idx").on(t.bookingId)],
);

export const roomBlocks = sqliteTable(
  "room_blocks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    roomTypeId: integer("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    roomsBlocked: integer("rooms_blocked").notNull().default(1),
    reason: text("reason").notNull(),
    adminNote: text("admin_note"),
    createdById: integer("created_by_id").references(() => adminUsers.id),
    ...timestamps,
  },
  (t) => [
    index("room_blocks_room_idx").on(t.roomTypeId),
    index("room_blocks_dates_idx").on(t.startDate, t.endDate),
  ],
);

export const pricingRules = sqliteTable(
  "pricing_rules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    roomTypeId: integer("room_type_id").references(() => roomTypes.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    ruleType: text("rule_type").notNull(),
    amount: real("amount").notNull(),
    isPercentage: integer("is_percentage", { mode: "boolean" })
      .notNull()
      .default(false),
    startDate: text("start_date"),
    endDate: text("end_date"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index("pricing_rules_room_idx").on(t.roomTypeId)],
);

export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    currency: text("currency").notNull().default("USD"),
    method: text("method").notNull(),
    status: text("status").notNull().default("Paid"),
    transactionReference: text("transaction_reference"),
    paymentDate: text("payment_date"),
    adminNote: text("admin_note"),
    recordedById: integer("recorded_by_id").references(() => adminUsers.id),
    ...timestamps,
  },
  (t) => [index("payments_booking_idx").on(t.bookingId)],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    templateKey: text("template_key").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    recipientName: text("recipient_name"),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    relatedType: text("related_type"),
    relatedId: integer("related_id"),
    status: text("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    sentAt: text("sent_at"),
    ...timestamps,
  },
  (t) => [
    index("notifications_status_idx").on(t.status),
    index("notifications_related_idx").on(t.relatedType, t.relatedId),
  ],
);

export const conferencePackages = sqliteTable("conference_packages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  capacity: integer("capacity").notNull().default(20),
  basePrice: real("base_price"),
  imageUrl: text("image_url"),
  featuresJson: text("features_json"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  translationsJson: text("translations_json"),
  ...timestamps,
});

/** New Enquiry | Contacted | Quotation Sent | Awaiting Approval | Approved | Confirmed | Declined | Cancelled | Completed */
export const conferenceEnquiries = sqliteTable(
  "conference_enquiries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reference: text("reference").notNull().unique(),
    packageId: integer("package_id").references(() => conferencePackages.id),
    contactName: text("contact_name").notNull(),
    company: text("company"),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    whatsapp: text("whatsapp"),
    eventType: text("event_type").notNull(),
    preferredDate: text("preferred_date").notNull(),
    alternativeDate: text("alternative_date"),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    attendees: integer("attendees").notNull(),
    seatingArrangement: text("seating_arrangement"),
    cateringRequired: integer("catering_required", { mode: "boolean" }).default(
      false,
    ),
    projectorRequired: integer("projector_required", {
      mode: "boolean",
    }).default(false),
    soundSystemRequired: integer("sound_system_required", {
      mode: "boolean",
    }).default(false),
    internetRequired: integer("internet_required", { mode: "boolean" }).default(
      false,
    ),
    accommodationRequired: integer("accommodation_required", {
      mode: "boolean",
    }).default(false),
    cateringNotes: text("catering_notes"),
    additionalNotes: text("additional_notes"),
    status: text("status").notNull().default("New Enquiry"),
    quotationAmount: real("quotation_amount"),
    quotationNotes: text("quotation_notes"),
    adminNotes: text("admin_notes"),
    /** n/a | unpaid | paid | pending */
    paymentStatus: text("payment_status").notNull().default("n/a"),
    ...timestamps,
  },
  (t) => [
    index("conference_enquiries_status_idx").on(t.status),
    index("conference_enquiries_date_idx").on(t.preferredDate),
  ],
);

export const menuCategories = sqliteTable(
  "menu_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    itemType: text("item_type").notNull().default("food"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    archivedAt: text("archived_at"),
    translationsJson: text("translations_json"),
    ...timestamps,
  },
  (t) => [
    index("menu_categories_active_idx").on(t.isActive),
    index("menu_categories_order_idx").on(t.displayOrder),
  ],
);

export const menuItems = sqliteTable(
  "menu_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => menuCategories.id),
    name: text("name").notNull(),
    slug: text("slug"),
    sku: text("sku"),
    shortDescription: text("short_description"),
    description: text("description"),
    translationsJson: text("translations_json"),
    /** Standard price (legacy column name kept for compatibility) */
    price: real("price").notNull(),
    promotionalPrice: real("promotional_price"),
    currency: text("currency").notNull().default("USD"),
    priceUnit: text("price_unit").notNull().default("per_item"),
    imageUrl: text("image_url"),
    itemType: text("item_type").notNull().default("food"),
    tags: text("tags"),
    quantityAvailable: integer("quantity_available"),
    preparationTimeMinutes: integer("preparation_time_minutes"),
    availableFrom: text("available_from"),
    availableUntil: text("available_until"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    isAvailable: integer("is_available", { mode: "boolean" })
      .notNull()
      .default(true),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    allowPreOrder: integer("allow_pre_order", { mode: "boolean" })
      .notNull()
      .default(true),
    allowRoomBooking: integer("allow_room_booking", { mode: "boolean" })
      .notNull()
      .default(false),
    allowConferenceBooking: integer("allow_conference_booking", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    isVegetarian: integer("is_vegetarian", { mode: "boolean" }).default(false),
    isVegan: integer("is_vegan", { mode: "boolean" }).default(false),
    isHalal: integer("is_halal", { mode: "boolean" }).default(false),
    isGlutenFree: integer("is_gluten_free", { mode: "boolean" }).default(false),
    containsNuts: integer("contains_nuts", { mode: "boolean" }).default(false),
    isSpicy: integer("is_spicy", { mode: "boolean" }).default(false),
    allergens: text("allergens"),
    ingredients: text("ingredients"),
    servingSize: text("serving_size"),
    displayOrder: integer("display_order").notNull().default(0),
    publicVisible: integer("public_visible", { mode: "boolean" })
      .notNull()
      .default(true),
    adminNotes: text("admin_notes"),
    archivedAt: text("archived_at"),
    createdById: integer("created_by_id").references(() => adminUsers.id),
    updatedById: integer("updated_by_id").references(() => adminUsers.id),
    ...timestamps,
  },
  (t) => [
    index("menu_items_category_idx").on(t.categoryId),
    index("menu_items_type_idx").on(t.itemType),
    index("menu_items_active_idx").on(t.isActive),
    index("menu_items_available_idx").on(t.isAvailable),
    index("menu_items_order_idx").on(t.displayOrder),
    uniqueIndex("menu_items_slug_unique").on(t.slug),
  ],
);

export const menuItemImages = sqliteTable(
  "menu_item_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    menuItemId: integer("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    originalFilename: text("original_filename").notNull(),
    storageKey: text("storage_key").notNull(),
    imageUrl: text("image_url").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    displayOrder: integer("display_order").notNull().default(0),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("menu_item_images_item_idx").on(t.menuItemId),
    index("menu_item_images_order_idx").on(t.displayOrder),
  ],
);

export const bookingExtras = sqliteTable(
  "booking_extras",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    foodOrderId: integer("food_order_id"),
    menuItemId: integer("menu_item_id").references(() => menuItems.id),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: real("unit_price").notNull(),
    totalPrice: real("total_price").notNull(),
    specialInstructions: text("special_instructions"),
    imageUrl: text("image_url"),
    ...timestamps,
  },
  (t) => [
    index("booking_extras_booking_idx").on(t.bookingId),
    index("booking_extras_food_order_idx").on(t.foodOrderId),
  ],
);

/** Kitchen / food pre-order header (booking-linked or standalone). */
export const foodOrders = sqliteTable(
  "food_orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reference: text("reference").notNull().unique(),
    bookingId: integer("booking_id").references(() => bookings.id, {
      onDelete: "cascade",
    }),
    guestName: text("guest_name"),
    guestEmail: text("guest_email"),
    guestPhone: text("guest_phone"),
    serviceDate: text("service_date"),
    serviceTime: text("service_time"),
    serviceType: text("service_type"),
    /** Pending | Preparing | Ready | Delivered | Cancelled */
    status: text("status").notNull().default("Pending"),
    /** pending | paid | unpaid — booking-linked orders use unpaid (covered by booking) */
    paymentStatus: text("payment_status").notNull().default("pending"),
    specialInstructions: text("special_instructions"),
    totalAmount: real("total_amount").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("food_orders_booking_uidx").on(t.bookingId),
    index("food_orders_status_idx").on(t.status),
    index("food_orders_created_idx").on(t.createdAt),
  ],
);

export const foodOrderItems = sqliteTable(
  "food_order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    foodOrderId: integer("food_order_id")
      .notNull()
      .references(() => foodOrders.id, { onDelete: "cascade" }),
    menuItemId: integer("menu_item_id").references(() => menuItems.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: real("unit_price").notNull(),
    totalPrice: real("total_price").notNull(),
    specialInstructions: text("special_instructions"),
    imageUrl: text("image_url"),
    ...timestamps,
  },
  (t) => [index("food_order_items_order_idx").on(t.foodOrderId)],
);

export const adminAuditLogs = sqliteTable(
  "admin_audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    adminUserId: integer("admin_user_id").references(() => adminUsers.id),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    detailsJson: text("details_json"),
    ipAddress: text("ip_address"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("admin_audit_logs_user_idx").on(t.adminUserId),
    index("admin_audit_logs_created_idx").on(t.createdAt),
  ],
);

export const siteSettings = sqliteTable("site_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const galleryImages = sqliteTable(
  "gallery_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    imageUrl: text("image_url").notNull(),
    altText: text("alt_text"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("gallery_images_order_idx").on(t.displayOrder),
    index("gallery_images_active_idx").on(t.isActive),
  ],
);

/** Public entertainment / programme events (distinct from conference enquiries). */
export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    shortDescription: text("short_description"),
    description: text("description"),
    category: text("category").notNull().default("Other"),
    tagsJson: text("tags_json"),
    artistOrHost: text("artist_or_host"),
    venueName: text("venue_name").notNull().default("Highbury Lounge"),
    venueAddress: text("venue_address")
      .notNull()
      .default("7504 Greenfield Cherries, Kadoma, Zimbabwe"),
    /** ISO local datetime YYYY-MM-DDTHH:mm:ss */
    startAt: text("start_at").notNull(),
    endAt: text("end_at"),
    timezone: text("timezone").notNull().default("Africa/Harare"),
    coverImage: text("cover_image"),
    posterImage: text("poster_image"),
    galleryJson: text("gallery_json"),
    /** free | fixed | from | contact */
    entryType: text("entry_type").notNull().default("contact"),
    currency: text("currency").notNull().default("USD"),
    price: real("price"),
    capacity: integer("capacity"),
    trackCapacity: integer("track_capacity", { mode: "boolean" })
      .notNull()
      .default(false),
    soldOutOverride: integer("sold_out_override", { mode: "boolean" })
      .notNull()
      .default(false),
    limitedSpaceThreshold: integer("limited_space_threshold").default(10),
    /** reserve_table | book_tickets | register | guest_list | enquiry | whatsapp | external | none */
    actionType: text("action_type").notNull().default("reserve_table"),
    customActionLabel: text("custom_action_label"),
    externalBookingUrl: text("external_booking_url"),
    enableOnlineReservations: integer("enable_online_reservations", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    minGuests: integer("min_guests").notNull().default(1),
    maxGuestsPerReservation: integer("max_guests_per_reservation")
      .notNull()
      .default(10),
    reservationDeadline: text("reservation_deadline"),
    requireApproval: integer("require_approval", { mode: "boolean" })
      .notNull()
      .default(true),
    programmeJson: text("programme_json"),
    dressCode: text("dress_code"),
    ageNote: text("age_note"),
    attendanceInfo: text("attendance_info"),
    /** draft | scheduled | published | postponed | cancelled | completed */
    status: text("status").notNull().default("draft"),
    isFeatured: integer("is_featured", { mode: "boolean" })
      .notNull()
      .default(false),
    showAnnouncement: integer("show_announcement", { mode: "boolean" })
      .notNull()
      .default(false),
    publishedAt: text("published_at"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    socialImage: text("social_image"),
    deletedAt: text("deleted_at"),
    ...timestamps,
  },
  (t) => [
    index("events_status_idx").on(t.status),
    index("events_start_idx").on(t.startAt),
    index("events_category_idx").on(t.category),
    index("events_featured_idx").on(t.isFeatured),
  ],
);

export const eventReservations = sqliteTable(
  "event_reservations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reference: text("reference").notNull().unique(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    guestCount: integer("guest_count").notNull().default(1),
    reservationType: text("reservation_type"),
    seatingRequest: text("seating_request"),
    notes: text("notes"),
    /** Pending | Confirmed | Declined | Cancelled | Attended | No Show */
    status: text("status").notNull().default("Pending"),
    adminNotes: text("admin_notes"),
    consentAccepted: integer("consent_accepted", { mode: "boolean" })
      .notNull()
      .default(false),
    ...timestamps,
  },
  (t) => [
    index("event_reservations_event_idx").on(t.eventId),
    index("event_reservations_status_idx").on(t.status),
    index("event_reservations_created_idx").on(t.createdAt),
  ],
);

/** Paid ticket categories for an event (VIP, Standard, etc.). */
export const eventTicketTypes = sqliteTable(
  "event_ticket_types",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    currency: text("currency").notNull().default("USD"),
    price: real("price").notNull(),
    capacity: integer("capacity"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index("event_ticket_types_event_idx").on(t.eventId)],
);

/**
 * Ticket purchase orders paid by bank transfer.
 * payment_status: pending | paid | cancelled
 */
export const eventTicketOrders = sqliteTable(
  "event_ticket_orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reference: text("reference").notNull().unique(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ticketTypeId: integer("ticket_type_id")
      .notNull()
      .references(() => eventTicketTypes.id, { onDelete: "restrict" }),
    ticketTypeName: text("ticket_type_name").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: real("unit_price").notNull(),
    totalAmount: real("total_amount").notNull(),
    currency: text("currency").notNull().default("USD"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    paymentMethod: text("payment_method").notNull().default("bank_transfer"),
    ticketCode: text("ticket_code"),
    adminNotes: text("admin_notes"),
    verifiedAt: text("verified_at"),
    verifiedBy: integer("verified_by"),
    ...timestamps,
  },
  (t) => [
    index("event_ticket_orders_event_idx").on(t.eventId),
    index("event_ticket_orders_status_idx").on(t.paymentStatus),
    index("event_ticket_orders_created_idx").on(t.createdAt),
  ],
);

export const eventSubscribers = sqliteTable(
  "event_subscribers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull().unique(),
    /** active | unsubscribed */
    status: text("status").notNull().default("active"),
    source: text("source").notNull().default("events_page"),
    subscribedAt: text("subscribed_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    unsubscribedAt: text("unsubscribed_at"),
    ...timestamps,
  },
  (t) => [index("event_subscribers_status_idx").on(t.status)],
);

/** In-app admin notifications (separate from guest email notifications). */
export const adminNotifications = sqliteTable(
  "admin_notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    adminUserId: integer("admin_user_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    actionUrl: text("action_url"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    readAt: text("read_at"),
    ...timestamps,
  },
  (t) => [
    index("admin_notifications_read_idx").on(t.isRead),
    index("admin_notifications_created_idx").on(t.createdAt),
    index("admin_notifications_user_idx").on(t.adminUserId),
  ],
);

/** First-party public site page views (anonymous visitor cookie). */
export const sitePageViews = sqliteTable(
  "site_page_views",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    visitorId: text("visitor_id").notNull(),
    path: text("path").notNull(),
    referrer: text("referrer"),
    title: text("title"),
    userAgent: text("user_agent"),
    country: text("country"),
    ip: text("ip"),
    device: text("device"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("site_page_views_created_idx").on(t.createdAt),
    index("site_page_views_path_idx").on(t.path),
    index("site_page_views_visitor_idx").on(t.visitorId),
  ],
);

/** Paynow gateway payment attempts linked to bookings, tickets, food, conference. */
export const paynowTransactions = sqliteTable(
  "paynow_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reference: text("reference").notNull().unique(),
    /** booking | ticket_order | food_order | conference */
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull().default("USD"),
    /** pending | paid | cancelled | failed */
    status: text("status").notNull().default("pending"),
    paynowReference: text("paynow_reference"),
    pollUrl: text("poll_url"),
    browserUrl: text("browser_url"),
    rawInitJson: text("raw_init_json"),
    rawResultJson: text("raw_result_json"),
    ...timestamps,
  },
  (t) => [
    index("paynow_transactions_entity_idx").on(t.entityType, t.entityId),
    index("paynow_transactions_status_idx").on(t.status),
  ],
);
