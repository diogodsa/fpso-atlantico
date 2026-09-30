CREATE TABLE `inspection_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inspection_photo_owner` ON `inspection_photos` (`owner`);--> statement-breakpoint
CREATE TABLE `inspection_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`equipment_id` text NOT NULL,
	`payload` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inspection_owner_equipment` ON `inspection_records` (`owner`,`equipment_id`);--> statement-breakpoint
CREATE TABLE `maintenance_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`inspection_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`payload` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `maintenance_owner_inspection` ON `maintenance_tasks` (`owner`,`inspection_id`);