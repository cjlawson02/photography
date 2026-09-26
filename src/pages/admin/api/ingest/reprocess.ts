import type { APIRoute } from 'astro';

import { jsonOk, parseJsonBody } from '../../../../lib/admin/http.ts';
import { createCaller } from '../../../../lib/trpc/caller.ts';
import { createTrpcContext } from '../../../../lib/trpc/context.ts';
import { trpcErrorToResponse } from '../../../../lib/trpc/errors.ts';
import { reprocessBodySchema } from '../../../../lib/ingest/schemas.ts';

/** @deprecated Prefer `ingest.reprocess` tRPC — kept for smoke docs. */
export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await parseJsonBody(request, reprocessBodySchema);
		const caller = createCaller(createTrpcContext({ request }));
		const result = await caller.ingest.reprocess(body);
		return jsonOk(result);
	} catch (error) {
		return trpcErrorToResponse(error);
	}
};
