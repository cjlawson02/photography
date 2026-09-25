-- Phase 1 minimal ingest tables (portfolio + review domains).
-- Exact product columns remain _TBD_ in docs/HLD.md.
-- R2 keys are derived from id (`{id}/original`, variants) — not stored.
-- Ingest failures are logged; status may be `failed` without an error string column.

CREATE TABLE `portfolio_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL CHECK (`status` IN ('pending', 'ready', 'failed')),
	`content_type` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `review_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL CHECK (`status` IN ('pending', 'ready', 'failed')),
	`content_type` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
