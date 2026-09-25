import type { z } from 'zod/v4';

import { accessDeniedResponse, verifyAccessJwt, type AccessEnv } from '../access/verify-jwt.ts';
import {
	AppError,
	formatZodIssues,
	type HttpErrorStatus,
} from '../http/app-error.ts';

export { accessDeniedResponse };

/** Verify Access JWT; return identity or a 403 Response. */
export async function requireAdmin(
	request: Request,
	env: AccessEnv,
): Promise<{ email?: string } | Response> {
	try {
		const identity = await verifyAccessJwt(request, env);
		return { email: identity.email };
	} catch (error) {
		return accessDeniedResponse(error);
	}
}

export function jsonOk(data: unknown, init?: ResponseInit): Response {
	return Response.json({ ok: true, ...asObject(data) }, init);
}

export function jsonError(message: string, status: HttpErrorStatus): Response {
	return Response.json({ ok: false, error: message }, { status });
}

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		throw new AppError('BAD_REQUEST', 'Invalid JSON body');
	}
	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		throw new AppError('BAD_REQUEST', formatZodIssues(parsed.error));
	}
	return parsed.data;
}

function asObject(data: unknown): Record<string, unknown> {
	if (data && typeof data === 'object' && !Array.isArray(data)) {
		return data as Record<string, unknown>;
	}
	return { data };
}
