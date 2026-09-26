ALTER TABLE `ReviewCollections` ADD `personName` text;--> statement-breakpoint
ALTER TABLE `ReviewCollections` ADD `status` text DEFAULT 'setup' NOT NULL;--> statement-breakpoint
ALTER TABLE `ReviewCollections` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `ReviewCollections` ADD `sharedAt` integer;--> statement-breakpoint
ALTER TABLE `ReviewCollections` ADD `submittedAt` integer;--> statement-breakpoint
ALTER TABLE `ReviewCollections` ADD `deliveredAt` integer;--> statement-breakpoint
ALTER TABLE `ReviewCollections` ADD `closedAt` integer;