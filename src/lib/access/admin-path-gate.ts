import { accessDeniedResponse, verifyAccessJwt, type AccessEnv } from './verify-jwt.ts';
import { applySecurityHeaders } from '../http/security-headers.ts';

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/**
 * Defense-in-depth JWT gate for `/admin*` HTML and API routes.
 * Returns a 403 Response when Access is configured and JWT is missing/invalid; otherwise null.
 */
export async function guardAdminPathAccess(
  request: Request,
  pathname: string,
  accessEnv: AccessEnv,
): Promise<Response | null> {
  if (!isAdminPath(pathname)) {
    return null;
  }

  if (!accessEnv.CF_ACCESS_TEAM_DOMAIN?.trim() || !accessEnv.CF_ACCESS_AUD?.trim()) {
    return null;
  }

  try {
    await verifyAccessJwt(request, accessEnv);
    return null;
  } catch (error) {
    const denied = accessDeniedResponse(error);
    applySecurityHeaders(denied.headers);
    return denied;
  }
}
