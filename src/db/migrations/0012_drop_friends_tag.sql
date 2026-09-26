-- Drop Friends tag: remap to People (dedupe if both were present).
UPDATE "PortfolioPhotos"
SET
	"tags" = (
		SELECT json_group_array(value)
		FROM (
			SELECT DISTINCT CASE WHEN je.value = 'Friends' THEN 'People' ELSE je.value END AS value
			FROM json_each("PortfolioPhotos"."tags") AS je
		)
	),
	"updatedAt" = (strftime('%s', 'now') * 1000)
WHERE EXISTS (
	SELECT 1 FROM json_each("PortfolioPhotos"."tags") AS je WHERE je.value = 'Friends'
);
