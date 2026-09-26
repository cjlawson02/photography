import type { APIRoute } from 'astro';

import { jsonOk } from '../../../../../lib/admin/http.ts';
import { reviewCollectionDeleteQuerySchema } from '../../../../../lib/admin/review-collection-schemas.ts';
import { createCaller } from '../../../../../lib/trpc/caller.ts';
import { createTrpcContext } from '../../../../../lib/trpc/context.ts';
import { trpcErrorToResponse } from '../../../../../lib/trpc/errors.ts';
import { idSchema } from '../../../../../db/schema/types.ts';
import { AppError } from '../../../../../lib/http/app-error.ts';

function collectionIdFromParams(params: { id?: string }): string {
	const parsed = idSchema.safeParse(params.id);
	if (!parsed.success) {
		throw new AppError('BAD_REQUEST', 'Invalid collection id');
	}
	return parsed.data;
}

/** @deprecated Prefer `review.collections.revoke` tRPC — kept for smoke docs. */
export const DELETE: APIRoute = async ({ request, params, url }) => {
	try {
		const id = collectionIdFromParams(params);
		const query = reviewCollectionDeleteQuerySchema.parse(Object.fromEntries(url.searchParams));
		const caller = createCaller(createTrpcContext({ request }));
		const collection = await caller.review.collections.revoke({
			id,
			cleanupR2: query.cleanupR2,
		});
		return jsonOk({ collection });
	} catch (error) {
		return trpcErrorToResponse(error);
	}
};
