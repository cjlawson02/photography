import type { APIRoute } from 'astro';

import { jsonOk, parseJsonBody } from '../../../../lib/admin/http.ts';
import { reviewCollectionCreateBodySchema } from '../../../../lib/admin/review-collection-schemas.ts';
import { createCaller } from '../../../../lib/trpc/caller.ts';
import { createTrpcContext } from '../../../../lib/trpc/context.ts';
import { trpcErrorToResponse } from '../../../../lib/trpc/errors.ts';

/** @deprecated Prefer `review.collections.list` tRPC — kept for smoke docs. */
export const GET: APIRoute = async ({ request }) => {
	try {
		const caller = createCaller(createTrpcContext({ request }));
		const collections = await caller.review.collections.list();
		return jsonOk({ collections });
	} catch (error) {
		return trpcErrorToResponse(error);
	}
};

/** @deprecated Prefer `review.collections.create` tRPC — kept for smoke docs. */
export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await parseJsonBody(request, reviewCollectionCreateBodySchema);
		const caller = createCaller(createTrpcContext({ request }));
		const collection = await caller.review.collections.create(body);
		return jsonOk({ collection }, { status: 201 });
	} catch (error) {
		return trpcErrorToResponse(error);
	}
};
