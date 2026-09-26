import type { inferRouterOutputs } from '@trpc/server';

import type { PortfolioPhotoAdminUpdateBody } from './portfolio-schemas.ts';
import type { AppRouter } from '../trpc/router.ts';
import { adminTrpc } from '../trpc/client.ts';

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type AdminPortfolioPhoto = RouterOutputs['portfolio']['list'][number];

export async function fetchPortfolioPhotos(): Promise<AdminPortfolioPhoto[]> {
	return adminTrpc.portfolio.list.query();
}

export async function patchPortfolioPhoto(
	id: string,
	body: PortfolioPhotoAdminUpdateBody,
): Promise<AdminPortfolioPhoto> {
	return adminTrpc.portfolio.update.mutate({ id, data: body });
}

export async function deletePortfolioPhoto(id: string): Promise<void> {
	await adminTrpc.portfolio.delete.mutate({ id });
}
