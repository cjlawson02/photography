import { describe, expect, it } from 'vitest';

import { canJoinFrontPage, frontPageBlockReason, needsDetails } from './front-page-eligibility.ts';

describe('canJoinFrontPage', () => {
  it('requires ready, published, alt, and category', () => {
    expect(
      canJoinFrontPage({
        status: 'ready',
        published: true,
        alt: 'Sunset',
        category: 'landscape',
      }),
    ).toBe(true);
    expect(
      canJoinFrontPage({
        status: 'ready',
        published: true,
        alt: '',
        category: 'landscape',
      }),
    ).toBe(false);
  });
});

describe('frontPageBlockReason', () => {
  const ready = { status: 'ready', published: true, alt: 'Sunset', category: 'landscape' } as const;

  it('explains missing details before publish state', () => {
    expect(frontPageBlockReason({ ...ready, alt: ' ', category: null, published: false })).toBe(
      'Needs details: add alt text and a category first.',
    );
    expect(frontPageBlockReason({ ...ready, category: null })).toBe(
      'Needs details: add a category first.',
    );
    expect(frontPageBlockReason({ ...ready, published: false })).toBe('Publish it first.');
  });

  it('explains processing and failed ingest', () => {
    expect(frontPageBlockReason({ ...ready, status: 'pending' })).toBe('Still processing.');
    expect(frontPageBlockReason({ ...ready, status: 'failed' })).toMatch(/retry or remove/);
  });

  it('returns null when eligible', () => {
    expect(frontPageBlockReason(ready)).toBeNull();
  });
});

describe('needsDetails', () => {
  it('flags ready photos missing alt or category only', () => {
    expect(needsDetails({ status: 'ready', alt: 'x', category: 'landscape' })).toBe(false);
    expect(needsDetails({ status: 'ready', alt: null, category: 'landscape' })).toBe(true);
    expect(needsDetails({ status: 'pending', alt: null, category: null })).toBe(false);
  });
});
