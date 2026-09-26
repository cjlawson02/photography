import { z } from 'zod/v4';

import { portfolioPhotoAdminUpdateBodySchema } from '../admin/portfolio-schemas.ts';
import { reviewCollectionCreateBodySchema } from '../admin/review-collection-schemas.ts';
import { idSchema } from '../../db/schema/types.ts';
import { completeBodySchema, presignBodySchema, reprocessBodySchema } from '../ingest/schemas.ts';
import { IngestService } from '../services/ingest-service.ts';
import { PortfolioService } from '../services/portfolio-service.ts';
import { ReviewService } from '../services/review-service.ts';
import { createTRPCRouter } from './init.ts';
import { adminProcedure, rateLimitedAdminProcedure } from './middleware.ts';

const portfolioUpdateInputSchema = z.object({
  id: idSchema,
  data: portfolioPhotoAdminUpdateBodySchema,
});

const portfolioDeleteInputSchema = z.object({
  id: idSchema,
  cleanupR2: z.boolean().default(true),
});

const reviewRevokeInputSchema = z.object({
  id: idSchema,
  cleanupR2: z.boolean().default(true),
});

export const appRouter = createTRPCRouter({
  portfolio: createTRPCRouter({
    list: adminProcedure.query(async ({ ctx }) =>
      PortfolioService.from(ctx.getAppEnv()).listForAdmin(),
    ),
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
      list: adminProcedure.query(async ({ ctx }) =>
        ctx.getAppEnv().d1.reviewCollections.listRecent(),
      ),
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
  }),
});

export type AppRouter = typeof appRouter;
