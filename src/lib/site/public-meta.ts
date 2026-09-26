/** Canonical public site origin (see docs/DEPLOY.md). */
export const SITE_ORIGIN = 'https://photography.chrislawson.dev';

export const SITE_NAME = 'Lawson Photography';

export const DEFAULT_SITE_DESCRIPTION =
	'Portfolio and client proofing for Lawson Photography.';

export function canonicalUrl(pathname: string): string {
	const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
	return `${SITE_ORIGIN}${path === '/' ? '' : path}`;
}
