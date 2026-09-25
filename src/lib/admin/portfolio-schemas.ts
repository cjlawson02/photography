import { z } from 'zod/v4';

import { portfolioPhotoUpdateSchema } from '../../db/schema/types.ts';

/** Admin PATCH body — catalog metadata only (not ingest `status`). */
export const portfolioPhotoAdminUpdateBodySchema = portfolioPhotoUpdateSchema
	.omit({ status: true, mimeType: true })
	.refine((value) => Object.keys(value).length > 0, 'At least one field required');

export type PortfolioPhotoAdminUpdateBody = z.infer<typeof portfolioPhotoAdminUpdateBodySchema>;

export const portfolioPhotoDeleteQuerySchema = z.object({
	cleanupR2: z
		.enum(['true', 'false'])
		.optional()
		.transform((value) => value !== 'false'),
});

export type PortfolioPhotoDeleteQuery = z.infer<typeof portfolioPhotoDeleteQuerySchema>;
