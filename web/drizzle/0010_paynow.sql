CREATE TABLE `paynow_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paynow_reference` text,
	`poll_url` text,
	`browser_url` text,
	`raw_init_json` text,
	`raw_result_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paynow_transactions_reference_uidx` ON `paynow_transactions` (`reference`);
--> statement-breakpoint
CREATE INDEX `paynow_transactions_entity_idx` ON `paynow_transactions` (`entity_type`,`entity_id`);
--> statement-breakpoint
CREATE INDEX `paynow_transactions_status_idx` ON `paynow_transactions` (`status`);
--> statement-breakpoint
ALTER TABLE `food_orders` ADD `payment_status` text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE `conference_enquiries` ADD `payment_status` text DEFAULT 'n/a' NOT NULL;
