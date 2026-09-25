ALTER TABLE `events` ADD `image_position_x` real DEFAULT 50;
--> statement-breakpoint
ALTER TABLE `events` ADD `image_position_y` real DEFAULT 50;
--> statement-breakpoint
ALTER TABLE `events` ADD `image_zoom` real DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `events` ADD `image_display_mode` text DEFAULT 'fill';
--> statement-breakpoint
ALTER TABLE `events` ADD `image_aspect_ratio` text DEFAULT '16/7';
