export const TRPC_URL = '/admin/api/trpc';

function reloadAdminForAccess(): void {
  if (typeof location !== 'undefined') {
    location.reload();
  }
}

function isAccessLoginResponse(response: Response): boolean {
  if (response.type === 'opaqueredirect') return true;
  if (response.status === 0) return true;
  const contentType = response.headers.get('content-type') ?? '';
  if ((response.status === 401 || response.status === 403) && contentType.includes('text/html')) {
    return true;
  }
  return false;
}

/** Shared browser fetch for admin tRPC — reload on Access session loss. */
export async function adminTrpcFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: 'same-origin',
    redirect: 'manual',
  });
  if (isAccessLoginResponse(response)) {
    reloadAdminForAccess();
    throw new Error('Access session expired — reloading admin…');
  }
  return response;
}
