CREATE TABLE IF NOT EXISTS `food_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`booking_id` integer,
	`guest_name` text,
	`guest_email` text,
	`guest_phone` text,
	`service_date` text,
	`service_time` text,
	`service_type` text,
	`status` text DEFAULT 'Pending' NOT NULL,
	`special_instructions` text,
	`total_amount` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `food_orders_reference_uidx` ON `food_orders` (`reference`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `food_orders_booking_uidx` ON `food_orders` (`booking_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `food_orders_status_idx` ON `food_orders` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `food_orders_created_idx` ON `food_orders` (`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `food_order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`food_order_id` integer NOT NULL,
	`menu_item_id` integer,
	`name` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	`special_instructions` text,
	`image_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`food_order_id`) REFERENCES `food_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `food_order_items_order_idx` ON `food_order_items` (`food_order_id`);
--> statement-breakpoint
ALTER TABLE `booking_extras` ADD COLUMN `food_order_id` integer REFERENCES `food_orders`(`id`) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `booking_extras` ADD COLUMN `special_instructions` text;
--> statement-breakpoint
ALTER TABLE `booking_extras` ADD COLUMN `image_url` text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `booking_extras_food_order_idx` ON `booking_extras` (`food_order_id`);
