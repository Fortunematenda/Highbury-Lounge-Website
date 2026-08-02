CREATE TABLE IF NOT EXISTS `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`short_description` text,
	`description` text,
	`category` text DEFAULT 'Other' NOT NULL,
	`tags_json` text,
	`artist_or_host` text,
	`venue_name` text DEFAULT 'Highbury Lounge' NOT NULL,
	`venue_address` text DEFAULT '7504 Greenfield Cherries, Kadoma, Zimbabwe' NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text,
	`timezone` text DEFAULT 'Africa/Harare' NOT NULL,
	`cover_image` text,
	`poster_image` text,
	`gallery_json` text,
	`entry_type` text DEFAULT 'contact' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`price` real,
	`capacity` integer,
	`track_capacity` integer DEFAULT false NOT NULL,
	`sold_out_override` integer DEFAULT false NOT NULL,
	`limited_space_threshold` integer DEFAULT 10,
	`action_type` text DEFAULT 'reserve_table' NOT NULL,
	`custom_action_label` text,
	`external_booking_url` text,
	`enable_online_reservations` integer DEFAULT true NOT NULL,
	`min_guests` integer DEFAULT 1 NOT NULL,
	`max_guests_per_reservation` integer DEFAULT 10 NOT NULL,
	`reservation_deadline` text,
	`require_approval` integer DEFAULT true NOT NULL,
	`programme_json` text,
	`dress_code` text,
	`age_note` text,
	`attendance_info` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`show_announcement` integer DEFAULT false NOT NULL,
	`published_at` text,
	`seo_title` text,
	`seo_description` text,
	`social_image` text,
	`deleted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `events_slug_unique` ON `events` (`slug`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `events_status_idx` ON `events` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `events_start_idx` ON `events` (`start_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `events_category_idx` ON `events` (`category`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `events_featured_idx` ON `events` (`is_featured`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`event_id` integer NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`guest_count` integer DEFAULT 1 NOT NULL,
	`reservation_type` text,
	`seating_request` text,
	`notes` text,
	`status` text DEFAULT 'Pending' NOT NULL,
	`admin_notes` text,
	`consent_accepted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `event_reservations_reference_unique` ON `event_reservations` (`reference`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `event_reservations_event_idx` ON `event_reservations` (`event_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `event_reservations_status_idx` ON `event_reservations` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `event_reservations_created_idx` ON `event_reservations` (`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`source` text DEFAULT 'events_page' NOT NULL,
	`subscribed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`unsubscribed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `event_subscribers_email_unique` ON `event_subscribers` (`email`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `event_subscribers_status_idx` ON `event_subscribers` (`status`);
