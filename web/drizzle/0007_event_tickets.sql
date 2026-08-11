-- Event ticket types (VIP, Standard, etc.) and bank-transfer orders.
CREATE TABLE `event_ticket_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`currency` text DEFAULT 'USD' NOT NULL,
	`price` real NOT NULL,
	`capacity` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_ticket_types_event_idx` ON `event_ticket_types` (`event_id`);
--> statement-breakpoint
CREATE TABLE `event_ticket_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`event_id` integer NOT NULL,
	`ticket_type_id` integer NOT NULL,
	`ticket_type_name` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` real NOT NULL,
	`total_amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`payment_method` text DEFAULT 'bank_transfer' NOT NULL,
	`ticket_code` text,
	`admin_notes` text,
	`verified_at` text,
	`verified_by` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_type_id`) REFERENCES `event_ticket_types`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_ticket_orders_reference_unique` ON `event_ticket_orders` (`reference`);
--> statement-breakpoint
CREATE INDEX `event_ticket_orders_event_idx` ON `event_ticket_orders` (`event_id`);
--> statement-breakpoint
CREATE INDEX `event_ticket_orders_status_idx` ON `event_ticket_orders` (`payment_status`);
--> statement-breakpoint
CREATE INDEX `event_ticket_orders_created_idx` ON `event_ticket_orders` (`created_at`);
