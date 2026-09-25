import type { APIRoute } from 'astro';

const BODY = `User-agent: *
Allow: /

Disallow: /review/
Disallow: /media/review/
`;

export const GET: APIRoute = async () => {
	return new Response(BODY, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
