import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createId } from '@paralleldrive/cuid2';

import { postReviewSelection } from './post-selection.ts';

function jsonRequest(body: unknown, init?: RequestInit): Request {
  return new Request('https://photography.example/review/api/selection', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...init?.headers },
    body: JSON.stringify(body),
    ...init,
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

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: 'Content-Type must be application/json',
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

    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), {
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

    assert.equal(response.status, 200);
    const json = (await response.json()) as { ok: boolean; photo: typeof photo };
    assert.equal(json.ok, true);
    assert.equal(json.photo.id, photo.id);
    assert.equal(json.photo.selectionStatus, photo.selectionStatus);
  });
});
