import { describe, expect, it } from 'vitest';

import { postReviewSubmitPicks } from './post-submit-picks.ts';

describe('postReviewSubmitPicks', () => {
  it('returns 405-style error for non-POST', async () => {
    const response = await postReviewSubmitPicks(
      {
        db: {} as D1Database,
        rateLimiter: undefined,
        submitPicks: async () =>
          ({
            collection: { status: 'picks_submitted' },
            pickCount: 2,
          }) as Awaited<ReturnType<typeof import('./submit-client-picks.ts').submitClientPicks>>,
      },
      new Request('https://example.com/review/api/submit-picks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: 'secret-slug' }),
      }),
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok: boolean; pickCount: number };
    expect(json.ok).toBe(true);
    expect(json.pickCount).toBe(2);
  });
});
