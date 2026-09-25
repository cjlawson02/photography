-- Phase 1 minimal ingest tables (portfolio + review domains).
-- Exact product columns remain _TBD_ in docs/HLD.md; these are the smallest
-- useful rows to track pending/ready/failed originals + key prefixes.

CREATE TABLE `portfolio_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL CHECK (`status` IN ('pending', 'ready', 'failed')),
	`content_type` text,
	`original_key` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `review_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL CHECK (`status` IN ('pending', 'ready', 'failed')),
	`content_type` text,
	`original_key` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
