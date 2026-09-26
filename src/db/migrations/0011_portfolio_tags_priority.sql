-- P8: mosaic priority (1–5). P9: replace single category with JSON tags array.
ALTER TABLE `PortfolioPhotos` ADD `tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `PortfolioPhotos` ADD `priority` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
UPDATE `PortfolioPhotos`
SET `tags` = CASE
	WHEN `category` IS NOT NULL AND length(trim(`category`)) > 0 THEN json_array(`category`)
	ELSE '[]'
END;--> statement-breakpoint
ALTER TABLE `PortfolioPhotos` DROP COLUMN `category`;
