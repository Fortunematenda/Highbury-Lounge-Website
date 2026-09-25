ALTER TABLE `bookings` ADD `channel_manager` text;
--> statement-breakpoint
ALTER TABLE `bookings` ADD `external_booking_id` text;
--> statement-breakpoint
ALTER TABLE `bookings` ADD `external_booking_reference` text;
--> statement-breakpoint
ALTER TABLE `bookings` ADD `sync_status` text DEFAULT 'NOT_SYNCED' NOT NULL;
--> statement-breakpoint
ALTER TABLE `bookings` ADD `last_synced_at` text;
--> statement-breakpoint
ALTER TABLE `bookings` ADD `last_sync_error` text;
--> statement-breakpoint
CREATE INDEX `bookings_source_idx` ON `bookings` (`source`);
--> statement-breakpoint
CREATE INDEX `bookings_sync_status_idx` ON `bookings` (`sync_status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_external_uidx` ON `bookings` (`channel_manager`,`external_booking_id`);
--> statement-breakpoint
CREATE TABLE `channel_room_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`local_room_type_id` integer NOT NULL,
	`external_property_id` text NOT NULL,
	`external_room_id` text NOT NULL,
	`external_room_name` text,
	`external_rate_plan_id` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`local_room_type_id`) REFERENCES `room_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_room_mappings_provider_local_uidx` ON `channel_room_mappings` (`provider`,`local_room_type_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_room_mappings_provider_ext_uidx` ON `channel_room_mappings` (`provider`,`external_property_id`,`external_room_id`);
--> statement-breakpoint
CREATE INDEX `channel_room_mappings_provider_idx` ON `channel_room_mappings` (`provider`);
--> statement-breakpoint
CREATE TABLE `channel_sync_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`external_reference` text,
	`direction` text NOT NULL,
	`event_type` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `channel_sync_logs_provider_idx` ON `channel_sync_logs` (`provider`);
--> statement-breakpoint
CREATE INDEX `channel_sync_logs_created_idx` ON `channel_sync_logs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `channel_sync_logs_status_idx` ON `channel_sync_logs` (`status`);
--> statement-breakpoint
CREATE INDEX `channel_sync_logs_entity_idx` ON `channel_sync_logs` (`entity_type`,`entity_id`);
