CREATE TABLE `PortfolioPhotos` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`status` text NOT NULL,
	`mimeType` text
);
--> statement-breakpoint
CREATE TABLE `ReviewPhotos` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`status` text NOT NULL,
	`mimeType` text
);
