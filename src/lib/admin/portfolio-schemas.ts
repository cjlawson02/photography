import { z } from 'zod/v4';

import { portfolioPhotoUpdateSchema } from '../../db/schema/types.ts';

/** Admin PATCH body — catalog metadata only (not ingest `status`). */
export const portfolioPhotoAdminUpdateBodySchema = portfolioPhotoUpdateSchema
  .omit({ status: true, mimeType: true, width: true, height: true })
  .refine((value) => Object.keys(value).length > 0, 'At least one field required');

export type PortfolioPhotoAdminUpdateBody = z.infer<typeof portfolioPhotoAdminUpdateBodySchema>;

export const PORTFOLIO_ADMIN_LIST_DEFAULT_LIMIT = 50;
export const PORTFOLIO_ADMIN_LIST_MAX_LIMIT = 100;

export const portfolioListInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(PORTFOLIO_ADMIN_LIST_MAX_LIMIT)
    .optional()
    .default(PORTFOLIO_ADMIN_LIST_DEFAULT_LIMIT),
});

export type PortfolioListInput = z.infer<typeof portfolioListInputSchema>;
