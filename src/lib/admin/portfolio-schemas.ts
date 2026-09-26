import { z } from 'zod/v4';

import { idSchema, portfolioPhotoUpdateSchema } from '../../db/schema/types.ts';
import { cleanupR2Field } from './cleanup-r2-field.ts';

/**
 * Admin PATCH body — catalog metadata only (not ingest `status`). Front-page membership goes
 * through `portfolio.frontPage.*` so eligibility is always enforced.
 */
export const portfolioPhotoAdminUpdateBodySchema = portfolioPhotoUpdateSchema
  .omit({
    status: true,
    mimeType: true,
    width: true,
    height: true,
    frontPage: true,
    frontPageOrder: true,
  })
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
  /** When true, only pending rows past the ingest stale cutoff (see stale-pending.ts). */
  stalePendingOnly: z.boolean().optional().default(false),
});

export type PortfolioListInput = z.infer<typeof portfolioListInputSchema>;

/** Per-request id cap for bulk procedures (D1 limits bound parameters per statement). */
export const PORTFOLIO_BULK_MAX_IDS = 50;

const bulkIdsSchema = z.array(idSchema).min(1).max(PORTFOLIO_BULK_MAX_IDS);

export const PORTFOLIO_FRONT_PAGE_MAX = 500;

export const portfolioFrontPageReorderInputSchema = z.object({
  orderedIds: z.array(idSchema).min(1).max(PORTFOLIO_FRONT_PAGE_MAX),
});

/** Replace the whole front-page set (used by undo); newcomers must be eligible. */
export const portfolioFrontPageSetInputSchema = z.object({
  orderedIds: z.array(idSchema).max(PORTFOLIO_FRONT_PAGE_MAX),
  heroIds: z.array(idSchema).max(PORTFOLIO_FRONT_PAGE_MAX).optional(),
});

export const portfolioFrontPageAddInputSchema = z.object({
  ids: bulkIdsSchema,
});

export const portfolioBulkUpdateInputSchema = z.object({
  ids: bulkIdsSchema,
  data: portfolioPhotoAdminUpdateBodySchema,
});

export const portfolioBulkDeleteInputSchema = z.object({
  ids: bulkIdsSchema,
  cleanupR2: cleanupR2Field,
});
