import { accessDeniedResponse, verifyAccessJwt, type AccessEnv } from '../access/verify-jwt.ts';

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

export function jsonError(message: string, status: number): Response {
	return Response.json({ ok: false, error: message }, { status });
}

function asObject(data: unknown): Record<string, unknown> {
	if (data && typeof data === 'object' && !Array.isArray(data)) {
		return data as Record<string, unknown>;
	}
	return { data };
}
