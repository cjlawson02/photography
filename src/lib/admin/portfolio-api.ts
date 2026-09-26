import type { PortfolioPhotoAdminUpdateBody } from './portfolio-schemas.ts';
import type { AdminPortfolioPhoto } from './trpc-types.ts';
import { adminTrpc } from '../trpc/client.ts';

export type { AdminPortfolioPhoto } from './trpc-types.ts';

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
