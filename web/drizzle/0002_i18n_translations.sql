-- Multilingual content + guest preferred language
ALTER TABLE `room_types` ADD `translations_json` text;--> statement-breakpoint
ALTER TABLE `menu_categories` ADD `translations_json` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `translations_json` text;--> statement-breakpoint
ALTER TABLE `conference_packages` ADD `translations_json` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `preferred_language` text DEFAULT 'en';
