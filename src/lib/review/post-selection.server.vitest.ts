import { createId } from '@paralleldrive/cuid2';
import { describe, expect, it } from 'vitest';

import { REVIEW_SELECTION_MAX_JSON_BYTES } from '../admin/http.ts';
import { postReviewSelection } from './post-selection.ts';

function jsonRequest(body: unknown, init?: RequestInit): Request {
  return new Request('https://photography.example/review/api/selection', {
    method: 'POST',
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
    body: JSON.stringify(body),
  });
}

describe('postReviewSelection', () => {
  it('returns 400 when Content-Type is not JSON', async () => {
    const response = await postReviewSelection(
      { db: {} as D1Database, rateLimiter: undefined },
      new Request('https://photography.example/review/api/selection', {
        method: 'POST',
        body: JSON.stringify({ slug: 'x', photoId: createId(), selectionStatus: 'selected' }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Content-Type must be application/json',
    });
  });

  it('returns 400 when Content-Length exceeds the size cap', async () => {
    const response = await postReviewSelection(
      { db: {} as D1Database, rateLimiter: undefined },
      jsonRequest(
        { slug: 'x', photoId: createId(), selectionStatus: 'selected' },
        { headers: { 'content-length': String(REVIEW_SELECTION_MAX_JSON_BYTES + 1) } },
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Request body too large',
    });
  });

  it('returns 400 when JSON body exceeds the size cap', async () => {
    const padding = 'x'.repeat(REVIEW_SELECTION_MAX_JSON_BYTES);
    const response = await postReviewSelection(
      { db: {} as D1Database, rateLimiter: undefined },
      jsonRequest({
        slug: 'client-review-secret-slug',
        photoId: createId(),
        selectionStatus: 'selected',
        _padding: padding,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Request body too large',
    });
  });

  it('returns 429 when the rate limiter rejects the client', async () => {
    const response = await postReviewSelection(
      {
        db: {} as D1Database,
        rateLimiter: { limit: async () => ({ success: false }) },
      },
      jsonRequest(
        { slug: 'client-review-secret-slug', photoId: createId(), selectionStatus: 'selected' },
        { headers: { 'CF-Connecting-IP': '203.0.113.9' } },
      ),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Too many selection updates. Please wait a moment and try again.',
    });
  });

  it('returns { ok: true, photo } on success', async () => {
    const photoId = createId();
    const photo = {
      id: photoId,
      collectionId: createId(),
      selectionStatus: 'selected' as const,
      status: 'ready' as const,
      mimeType: 'image/jpeg',
      originalFilename: null,
      width: null,
      height: null,
      createdAt: 1,
      updatedAt: 2,
    };

    const response = await postReviewSelection(
      {
        db: {} as D1Database,
        rateLimiter: undefined,
        mutateSelection: async () => photo,
      },
      jsonRequest({ slug: 'client-review-secret-slug', photoId, selectionStatus: 'selected' }),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok: boolean; photo: typeof photo };
    expect(json.ok).toBe(true);
    expect(json.photo.id).toBe(photo.id);
    expect(json.photo.selectionStatus).toBe(photo.selectionStatus);
  });
});
