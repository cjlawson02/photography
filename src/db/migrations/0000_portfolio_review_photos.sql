CREATE TABLE `PortfolioPhotos` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`status` text NOT NULL,
	`mimeType` text
);
--> statement-breakpoint
CREATE TABLE `ReviewCollections` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text,
	`expiresAt` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ReviewCollections_slug_uidx` ON `ReviewCollections` (`slug`);--> statement-breakpoint
CREATE TABLE `ReviewPhotos` (
	`id` text PRIMARY KEY NOT NULL,
	`collectionId` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`status` text NOT NULL,
	`mimeType` text,
	`selectionStatus` text DEFAULT 'none' NOT NULL,
	FOREIGN KEY (`collectionId`) REFERENCES `ReviewCollections`(`id`) ON UPDATE no action ON DELETE no action
);
