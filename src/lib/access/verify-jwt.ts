import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export type AccessEnv = {
	CF_ACCESS_TEAM_DOMAIN: string;
	CF_ACCESS_AUD: string;
};

export type AccessIdentity = {
	email?: string;
	payload: JWTPayload;
};

const jwksByTeamDomain = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getAccessJwks(teamDomain: string): ReturnType<typeof createRemoteJWKSet> {
	let jwks = jwksByTeamDomain.get(teamDomain);
	if (!jwks) {
		jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
		jwksByTeamDomain.set(teamDomain, jwks);
	}
	return jwks;
}

/**
 * Verify Cloudflare Access JWT (`Cf-Access-Jwt-Assertion`).
 * Required on every `/admin/*` mutation — defense in depth beyond the edge Access policy.
 * @see docs/HLD.md#admin-auth
 */
export async function verifyAccessJwt(
	request: Request,
	env: AccessEnv,
): Promise<AccessIdentity> {
	const teamDomain = normalizeTeamDomain(env.CF_ACCESS_TEAM_DOMAIN);
	const audience = env.CF_ACCESS_AUD?.trim();

	if (!teamDomain || !audience) {
		throw new AccessAuthError('Access env not configured (CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD)');
	}

	const token = request.headers.get('cf-access-jwt-assertion');
	if (!token) {
		throw new AccessAuthError('Missing Cf-Access-Jwt-Assertion');
	}

	const JWKS = getAccessJwks(teamDomain);
	const { payload } = await jwtVerify(token, JWKS, {
		issuer: teamDomain,
		audience,
	});

	const email = typeof payload.email === 'string' ? payload.email : undefined;
	return { email, payload };
}

export class AccessAuthError extends Error {
	override name = 'AccessAuthError';
}

function normalizeTeamDomain(raw: string | undefined): string {
	if (!raw?.trim()) return '';
	const trimmed = raw.trim().replace(/\/$/, '');
	return trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
}

/** JSON 403 helper for `/admin/api/*` handlers. */
export function accessDeniedResponse(error: unknown): Response {
	const message =
		error instanceof AccessAuthError
			? error.message
			: error instanceof Error
				? error.message
				: 'Unauthorized';
	return Response.json({ ok: false, error: message }, { status: 403 });
}
