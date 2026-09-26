import type { APIRoute } from 'astro';

import { jsonOk } from '../../../../../lib/admin/http.ts';
import { createCaller } from '../../../../../lib/trpc/caller.ts';
import { createTrpcContext } from '../../../../../lib/trpc/context.ts';
import { trpcErrorToResponse } from '../../../../../lib/trpc/errors.ts';

/** @deprecated Prefer `portfolio.list` tRPC — kept for smoke docs. */
export const GET: APIRoute = async ({ request }) => {
	try {
		const caller = createCaller(createTrpcContext({ request }));
		const photos = await caller.portfolio.list();
		return jsonOk({ photos });
	} catch (error) {
		return trpcErrorToResponse(error);
	}
};
