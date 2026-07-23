CREATE TABLE `menu_item_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_item_id` integer NOT NULL,
	`original_filename` text NOT NULL,
	`storage_key` text NOT NULL,
	`image_url` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`alt_text` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `menu_item_images_item_idx` ON `menu_item_images` (`menu_item_id`);--> statement-breakpoint
CREATE INDEX `menu_item_images_order_idx` ON `menu_item_images` (`display_order`);--> statement-breakpoint
ALTER TABLE `menu_categories` ADD `description` text;--> statement-breakpoint
ALTER TABLE `menu_categories` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `menu_categories` ADD `item_type` text DEFAULT 'food' NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_categories` ADD `archived_at` text;--> statement-breakpoint
CREATE INDEX `menu_categories_active_idx` ON `menu_categories` (`is_active`);--> statement-breakpoint
CREATE INDEX `menu_categories_order_idx` ON `menu_categories` (`display_order`);--> statement-breakpoint
ALTER TABLE `menu_items` ADD `slug` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `sku` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `short_description` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `promotional_price` real;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `currency` text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `price_unit` text DEFAULT 'per_item' NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `quantity_available` integer;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `preparation_time_minutes` integer;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `available_from` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `available_until` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `is_featured` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `allow_pre_order` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `allow_room_booking` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `allow_conference_booking` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `is_vegetarian` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `is_vegan` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `is_halal` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `is_gluten_free` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `contains_nuts` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `is_spicy` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `allergens` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `ingredients` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `serving_size` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `public_visible` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `admin_notes` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `archived_at` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `created_by_id` integer REFERENCES admin_users(id);--> statement-breakpoint
ALTER TABLE `menu_items` ADD `updated_by_id` integer REFERENCES admin_users(id);--> statement-breakpoint
CREATE INDEX `menu_items_type_idx` ON `menu_items` (`item_type`);--> statement-breakpoint
CREATE INDEX `menu_items_active_idx` ON `menu_items` (`is_active`);--> statement-breakpoint
CREATE INDEX `menu_items_available_idx` ON `menu_items` (`is_available`);--> statement-breakpoint
CREATE INDEX `menu_items_order_idx` ON `menu_items` (`display_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `menu_items_slug_unique` ON `menu_items` (`slug`);