CREATE TABLE IF NOT EXISTS `gallery_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`image_url` text NOT NULL,
	`alt_text` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `gallery_images_order_idx` ON `gallery_images` (`display_order`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `gallery_images_active_idx` ON `gallery_images` (`is_active`);
