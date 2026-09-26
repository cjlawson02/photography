import type { inferRouterOutputs } from '@trpc/server';

import type { AppRouter } from '../trpc/router.ts';

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type AdminPortfolioPhoto = RouterOutputs['portfolio']['list'][number];
export type AdminReviewCollection = RouterOutputs['review']['collections']['list'][number];
