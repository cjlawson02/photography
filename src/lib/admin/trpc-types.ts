import type { inferRouterOutputs } from '@trpc/server';

import type { AppRouter } from '../trpc/router.ts';

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type AdminPortfolioListPage = RouterOutputs['portfolio']['list'];
export type AdminPortfolioPhoto = AdminPortfolioListPage['items'][number];
export type AdminReviewCollection = RouterOutputs['review']['collections']['list'][number];
export type AdminReviewCollectionDetail = RouterOutputs['review']['collections']['detail'];
export type AdminReviewCollectionDetailPhoto = AdminReviewCollectionDetail['photos'][number];
