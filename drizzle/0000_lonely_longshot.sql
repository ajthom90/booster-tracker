CREATE TABLE `booster` (
	`id` integer PRIMARY KEY NOT NULL,
	`serial_number` text NOT NULL,
	`status` text NOT NULL,
	`details` text,
	`flight_proven` integer,
	`flights` integer DEFAULT 0 NOT NULL,
	`successful_landings` integer DEFAULT 0 NOT NULL,
	`attempted_landings` integer DEFAULT 0 NOT NULL,
	`first_launch_date` text,
	`last_launch_date` text,
	`image_url` text,
	`launcher_config_id` integer,
	`ll2_url` text,
	`ll2_last_synced_at` text,
	FOREIGN KEY (`launcher_config_id`) REFERENCES `launcher_config`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booster_serial_unique` ON `booster` (`serial_number`);--> statement-breakpoint
CREATE INDEX `booster_status_idx` ON `booster` (`status`);--> statement-breakpoint
CREATE TABLE `landing_location` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`abbrev` text,
	`location_type` text NOT NULL,
	`description` text,
	`successful_landings` integer DEFAULT 0,
	`attempted_landings` integer DEFAULT 0,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `landing_location_slug_unique` ON `landing_location` (`slug`);--> statement-breakpoint
CREATE TABLE `launch` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`net` text NOT NULL,
	`window_start` text,
	`window_end` text,
	`mission_name` text,
	`mission_description` text,
	`mission_type` text,
	`orbit` text,
	`customer` text,
	`agency_id` integer,
	`launchpad_id` integer,
	`rocket_name` text,
	`image_url` text,
	`webcast_url` text,
	`ll2_last_synced_at` text,
	FOREIGN KEY (`launchpad_id`) REFERENCES `launchpad`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `launch_slug_unique` ON `launch` (`slug`);--> statement-breakpoint
CREATE INDEX `launch_net_idx` ON `launch` (`net`);--> statement-breakpoint
CREATE INDEX `launch_status_idx` ON `launch` (`status`);--> statement-breakpoint
CREATE TABLE `launch_booster` (
	`launch_id` text NOT NULL,
	`booster_id` integer NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`flight_number` integer,
	`landing_attempted` integer,
	`landing_success` integer,
	`landing_type` text,
	`landing_location_id` integer,
	PRIMARY KEY(`launch_id`, `booster_id`, `role`),
	FOREIGN KEY (`launch_id`) REFERENCES `launch`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`booster_id`) REFERENCES `booster`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`landing_location_id`) REFERENCES `landing_location`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `launch_booster_booster_idx` ON `launch_booster` (`booster_id`);--> statement-breakpoint
CREATE INDEX `launch_booster_launch_idx` ON `launch_booster` (`launch_id`);--> statement-breakpoint
CREATE TABLE `launcher_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`family` text,
	`full_name` text,
	`variant` text,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `launchpad` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`full_name` text,
	`location` text,
	`country_code` text,
	`total_launches` integer DEFAULT 0,
	`image_url` text,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `launchpad_slug_unique` ON `launchpad` (`slug`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`resource` text PRIMARY KEY NOT NULL,
	`last_full_sync_at` text,
	`last_incremental_sync_at` text,
	`next_url` text,
	`status` text DEFAULT 'ok' NOT NULL,
	`error_message` text
);
