-- Backfill Featured set from the existing published catalog (frontPage columns were added
-- empty in 0008). Order matches the public gallery fallback: sortOrder ASC nulls last,
-- then createdAt DESC. Existing hero flags are left alone.
WITH ordered AS (
	SELECT
		id,
		(ROW_NUMBER() OVER (
			ORDER BY
				CASE WHEN "sortOrder" IS NULL THEN 1 ELSE 0 END,
				"sortOrder" ASC,
				"createdAt" DESC
		) - 1) AS ord
	FROM "PortfolioPhotos"
	WHERE "published" = 1 AND "status" = 'ready'
)
UPDATE "PortfolioPhotos"
SET
	"frontPage" = 1,
	"frontPageOrder" = (SELECT ord FROM ordered WHERE ordered.id = "PortfolioPhotos".id),
	"updatedAt" = (strftime('%s', 'now') * 1000)
WHERE id IN (SELECT id FROM ordered);
