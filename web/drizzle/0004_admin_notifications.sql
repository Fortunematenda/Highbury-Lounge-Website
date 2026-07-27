CREATE TABLE IF NOT EXISTS `admin_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_user_id` integer,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`entity_type` text,
	`entity_id` integer,
	`action_url` text,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admin_notifications_read_idx` ON `admin_notifications` (`is_read`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admin_notifications_created_idx` ON `admin_notifications` (`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admin_notifications_user_idx` ON `admin_notifications` (`admin_user_id`);
