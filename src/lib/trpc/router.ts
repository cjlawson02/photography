import { z } from 'zod/v4';

import {
  portfolioListInputSchema,
  portfolioPhotoAdminUpdateBodySchema,
} from '../admin/portfolio-schemas.ts';
import { cleanupR2Field } from '../admin/cleanup-r2-field.ts';
import {
  reviewCollectionCreateBodySchema,
  reviewCollectionDeletePhotoInputSchema,
  reviewCollectionDetailInputSchema,
  reviewCollectionUpdateInputSchema,
} from '../admin/review-collection-schemas.ts';
import { idSchema } from '../../db/schema/types.ts';
import { completeBodySchema, presignBodySchema, reprocessBodySchema } from '../ingest/schemas.ts';
import { IngestMaintenanceService } from '../services/ingest-maintenance-service.ts';
import { IngestService } from '../services/ingest-service.ts';
import { PortfolioService } from '../services/portfolio-service.ts';
import { ReviewService } from '../services/review-service.ts';
import { createTRPCRouter } from './init.ts';
import { adminProcedure, rateLimitedAdminProcedure } from './middleware.ts';
import { scheduleStalePendingCleanup } from './schedule-stale-pending-cleanup.ts';

const portfolioUpdateInputSchema = z.object({
  id: idSchema,
  data: portfolioPhotoAdminUpdateBodySchema,
});

const portfolioDeleteInputSchema = z.object({
  id: idSchema,
  cleanupR2: cleanupR2Field,
});

const reviewRevokeInputSchema = z.object({
  id: idSchema,
  cleanupR2: cleanupR2Field,
});

export const appRouter = createTRPCRouter({
  portfolio: createTRPCRouter({
    list: adminProcedure.input(portfolioListInputSchema).query(async ({ ctx, input }) => {
      scheduleStalePendingCleanup(ctx);
      return PortfolioService.from(ctx.getAppEnv()).listForAdminPage(input);
    }),
    update: adminProcedure
      .input(portfolioUpdateInputSchema)
      .mutation(async ({ ctx, input }) =>
        PortfolioService.from(ctx.getAppEnv()).updateMetadata(input.id, input.data),
      ),
    delete: adminProcedure.input(portfolioDeleteInputSchema).mutation(async ({ ctx, input }) =>
      PortfolioService.from(ctx.getAppEnv())
        .deletePhoto(input.id, {
          cleanupR2: input.cleanupR2,
        })
        .then(() => ({ id: input.id })),
    ),
  }),
  review: createTRPCRouter({
    collections: createTRPCRouter({
      list: adminProcedure.query(async ({ ctx }) => {
        scheduleStalePendingCleanup(ctx);
        return ctx.getAppEnv().d1.reviewCollections.listRecent();
      }),
      create: adminProcedure
        .input(reviewCollectionCreateBodySchema)
        .mutation(async ({ ctx, input }) =>
          ReviewService.from(ctx.getAppEnv()).createCollection(input),
        ),
      revoke: adminProcedure.input(reviewRevokeInputSchema).mutation(async ({ ctx, input }) =>
        ReviewService.from(ctx.getAppEnv()).revokeCollection(input.id, {
          cleanupR2: input.cleanupR2,
        }),
      ),
      detail: adminProcedure
        .input(reviewCollectionDetailInputSchema)
        .query(async ({ ctx, input }) =>
          ReviewService.from(ctx.getAppEnv()).getCollectionDetailForAdmin(input.id),
        ),
      update: adminProcedure
        .input(reviewCollectionUpdateInputSchema)
        .mutation(async ({ ctx, input }) =>
          ReviewService.from(ctx.getAppEnv()).updateCollection(input.id, input.data),
        ),
      deletePhoto: adminProcedure
        .input(reviewCollectionDeletePhotoInputSchema)
        .mutation(async ({ ctx, input }) =>
          ReviewService.from(ctx.getAppEnv())
            .deleteCollectionPhoto(input.collectionId, input.photoId, {
              cleanupR2: input.cleanupR2,
            })
            .then(() => ({ id: input.photoId })),
        ),
    }),
  }),
  ingest: createTRPCRouter({
    presign: rateLimitedAdminProcedure
      .input(presignBodySchema)
      .mutation(async ({ ctx, input }) =>
        IngestService.from(ctx.getIngestAppEnv()).createPresign(input),
      ),
    complete: rateLimitedAdminProcedure
      .input(completeBodySchema)
      .mutation(async ({ ctx, input }) =>
        IngestService.from(ctx.getIngestAppEnv()).completeIngest(input),
      ),
    reprocess: rateLimitedAdminProcedure
      .input(reprocessBodySchema)
      .mutation(async ({ ctx, input }) =>
        IngestService.from(ctx.getIngestAppEnv()).reprocess(input),
      ),
    cleanupStalePending: adminProcedure.mutation(async ({ ctx }) =>
      IngestMaintenanceService.fromAppEnv(ctx.getAppEnv()).cleanupStalePending(),
    ),
  }),
});

export type AppRouter = typeof appRouter;
