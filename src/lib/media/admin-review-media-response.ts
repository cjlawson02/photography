import { parseReviewMediaPath } from './parse-review-media-path.ts';
import { isReviewMediaAllowedForAdmin } from './review-media-access.ts';
import { ADMIN_REVIEW_VARIANT_CACHE_CONTROL, REVIEW_ROBOTS_HEADER } from './review-cache.ts';

type ReviewObject = {
  body: ReadableStream | null;
  httpMetadata?: { contentType?: string };
  httpEtag?: string;
};

export type AdminReviewMediaDeps = {
  db: D1Database;
  getReviewObject: (r2Key: string) => Promise<ReviewObject | null>;
};

/** Shared logic for `GET /admin/api/media/review/{id}/{variant}` (JWT verified by route). */
export async function buildAdminReviewMediaResponse(
  path: string,
  deps: AdminReviewMediaDeps,
): Promise<Response> {
  const parsed = parseReviewMediaPath(path);
  if (!parsed.ok) {
    return new Response('Not Found', { status: 404 });
  }

  const allowed = await isReviewMediaAllowedForAdmin(deps.db, parsed.id);
  if (!allowed) {
    return new Response('Not Found', { status: 404 });
  }

  const object = await deps.getReviewObject(parsed.r2Key);
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Cache-Control', ADMIN_REVIEW_VARIANT_CACHE_CONTROL);
  headers.set('X-Robots-Tag', REVIEW_ROBOTS_HEADER);
  const contentType = object.httpMetadata?.contentType;
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  const etag = object.httpEtag;
  if (etag) {
    headers.set('ETag', etag);
  }

  return new Response(object.body, { status: 200, headers });
}
