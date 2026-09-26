import type { APIRoute } from 'astro';

import { jsonOk } from '../../../../../lib/admin/http.ts';
import { createCaller } from '../../../../../lib/trpc/caller.ts';
import { createTrpcContext } from '../../../../../lib/trpc/context.ts';
import { trpcErrorToResponse } from '../../../../../lib/trpc/errors.ts';
import {
	portfolioPhotoAdminUpdateBodySchema,
	portfolioPhotoDeleteQuerySchema,
} from '../../../../../lib/admin/portfolio-schemas.ts';
import { idSchema } from '../../../../../db/schema/types.ts';
import { AppError } from '../../../../../lib/http/app-error.ts';

function photoIdFromParams(params: { id?: string }): string {
	const parsed = idSchema.safeParse(params.id);
	if (!parsed.success) {
		throw new AppError('BAD_REQUEST', 'Invalid photo id');
	}
	return parsed.data;
}

/** @deprecated Prefer `portfolio.update` tRPC — kept for smoke docs. */
export const PATCH: APIRoute = async ({ request, params }) => {
	try {
		const id = photoIdFromParams(params);
		const raw = await request.json();
		const data = portfolioPhotoAdminUpdateBodySchema.parse(raw);
		const caller = createCaller(createTrpcContext({ request }));
		const photo = await caller.portfolio.update({ id, data });
		return jsonOk({ photo });
	} catch (error) {
		return trpcErrorToResponse(error);
	}
};

/** @deprecated Prefer `portfolio.delete` tRPC — kept for smoke docs. */
export const DELETE: APIRoute = async ({ request, params, url }) => {
	try {
		const id = photoIdFromParams(params);
		const query = portfolioPhotoDeleteQuerySchema.parse(Object.fromEntries(url.searchParams));
		const caller = createCaller(createTrpcContext({ request }));
		await caller.portfolio.delete({ id, cleanupR2: query.cleanupR2 });
		return jsonOk({ id });
	} catch (error) {
		return trpcErrorToResponse(error);
	}
};
