import type { APIRoute } from 'astro';

import { jsonOk, parseJsonBody } from '../../../../lib/admin/http.ts';
import { createCaller } from '../../../../lib/trpc/caller.ts';
import { createTrpcContext } from '../../../../lib/trpc/context.ts';
import { trpcErrorToResponse } from '../../../../lib/trpc/errors.ts';
import { presignBodySchema } from '../../../../lib/ingest/schemas.ts';

/** @deprecated Prefer `ingest.presign` tRPC — kept for smoke docs. */
export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await parseJsonBody(request, presignBodySchema);
		const caller = createCaller(createTrpcContext({ request }));
		const result = await caller.ingest.presign(body);
		return jsonOk(result);
	} catch (error) {
		return trpcErrorToResponse(error);
	}
};
