import { z } from 'zod/v4';

import {
	portfolioPhotoAdminUpdateBodySchema,
} from '../admin/portfolio-schemas.ts';
import { reviewCollectionCreateBodySchema } from '../admin/review-collection-schemas.ts';
import { idSchema } from '../../db/schema/types.ts';
import { AppError } from '../http/app-error.ts';
import {
	completeBodySchema,
	presignBodySchema,
	reprocessBodySchema,
} from '../ingest/schemas.ts';
import { IngestService } from '../services/ingest-service.ts';
import { PortfolioService } from '../services/portfolio-service.ts';
import { ReviewService } from '../services/review-service.ts';
import { createTRPCRouter } from './init.ts';
import { adminProcedure } from './middleware.ts';
import { runAppProcedure } from './errors.ts';

const portfolioUpdateInputSchema = z.object({
	id: idSchema,
	data: portfolioPhotoAdminUpdateBodySchema,
});

const portfolioDeleteInputSchema = z.object({
	id: idSchema,
	cleanupR2: z.boolean().optional(),
});

const reviewRevokeInputSchema = z.object({
	id: idSchema,
	cleanupR2: z.boolean().optional(),
});

export const appRouter = createTRPCRouter({
	portfolio: createTRPCRouter({
		list: adminProcedure.query(async ({ ctx }) =>
			runAppProcedure(async () =>
				PortfolioService.from(ctx.appEnv).listForAdmin(),
			),
		),
		update: adminProcedure.input(portfolioUpdateInputSchema).mutation(async ({ ctx, input }) =>
			runAppProcedure(async () =>
				PortfolioService.from(ctx.appEnv).updateMetadata(input.id, input.data),
			),
		),
		delete: adminProcedure.input(portfolioDeleteInputSchema).mutation(async ({ ctx, input }) =>
			runAppProcedure(async () => {
				await PortfolioService.from(ctx.appEnv).deletePhoto(input.id, {
					cleanupR2: input.cleanupR2 ?? true,
				});
				return { id: input.id };
			}),
		),
	}),
	review: createTRPCRouter({
		collections: createTRPCRouter({
			list: adminProcedure.query(async ({ ctx }) =>
				runAppProcedure(async () => ctx.appEnv.d1.reviewCollections.listRecent()),
			),
			create: adminProcedure
				.input(reviewCollectionCreateBodySchema)
				.mutation(async ({ ctx, input }) =>
					runAppProcedure(async () => {
						const dao = ctx.appEnv.d1.reviewCollections;
						const existing = await dao.getBySlug(input.slug);
						if (existing) {
							throw new AppError('BAD_REQUEST', 'Slug already in use');
						}
						return dao.insert(input);
					}),
				),
			revoke: adminProcedure.input(reviewRevokeInputSchema).mutation(async ({ ctx, input }) =>
				runAppProcedure(async () =>
					ReviewService.from(ctx.appEnv).revokeCollection(input.id, {
						cleanupR2: input.cleanupR2 ?? true,
					}),
				),
			),
		}),
	}),
	ingest: createTRPCRouter({
		presign: adminProcedure.input(presignBodySchema).mutation(async ({ ctx, input }) =>
			runAppProcedure(async () => IngestService.from(ctx.appEnv).createPresign(input)),
		),
		complete: adminProcedure.input(completeBodySchema).mutation(async ({ ctx, input }) =>
			runAppProcedure(async () => IngestService.from(ctx.appEnv).completeIngest(input)),
		),
		reprocess: adminProcedure.input(reprocessBodySchema).mutation(async ({ ctx, input }) =>
			runAppProcedure(async () => IngestService.from(ctx.appEnv).reprocess(input)),
		),
	}),
});

export type AppRouter = typeof appRouter;
