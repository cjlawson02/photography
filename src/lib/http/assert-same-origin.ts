import { AppError } from '../http/app-error.ts';

/**
 * Reject cross-origin POSTs to public review mutations (FIX-36).
 * Same-origin `fetch` sends `Origin`; missing `Origin` is allowed only with
 * `Sec-Fetch-Site: same-origin|same-site|none` (browser navigation / opaque).
 */
export function assertRequestSameOrigin(request: Request): void {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get('Origin');

  if (origin) {
    if (origin !== expectedOrigin) {
      throw new AppError('FORBIDDEN', 'Cross-origin request not allowed');
    }
    return;
  }

  const fetchSite = (request.headers.get('Sec-Fetch-Site') ?? '').toLowerCase();
  if (fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none') {
    return;
  }

  throw new AppError('FORBIDDEN', 'Missing Origin');
}
