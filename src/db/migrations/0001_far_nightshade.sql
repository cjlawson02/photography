ALTER TABLE `PortfolioPhotos` ADD `published` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `PortfolioPhotos` ADD `category` text;--> statement-breakpoint
ALTER TABLE `PortfolioPhotos` ADD `sortOrder` integer;--> statement-breakpoint
ALTER TABLE `PortfolioPhotos` ADD `hero` integer DEFAULT false NOT NULL;