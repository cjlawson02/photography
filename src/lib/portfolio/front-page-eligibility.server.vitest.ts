import { describe, expect, it } from 'vitest';

import { canJoinFrontPage, frontPageBlockReason, needsDetails } from './front-page-eligibility.ts';

describe('canJoinFrontPage', () => {
  it('requires ready, published, alt, and tags', () => {
    expect(
      canJoinFrontPage({
        status: 'ready',
        published: true,
        alt: 'Sunset',
        tags: ['Nature'],
      }),
    ).toBe(true);
    expect(
      canJoinFrontPage({
        status: 'ready',
        published: true,
        alt: '',
        tags: ['Nature'],
      }),
    ).toBe(false);
  });
});

describe('frontPageBlockReason', () => {
  const ready = {
    status: 'ready',
    published: true,
    alt: 'Sunset',
    tags: ['Nature'],
  } as const;

  it('explains missing details before publish state', () => {
    expect(frontPageBlockReason({ ...ready, alt: ' ', tags: [], published: false })).toBe(
      'Needs details: add alt text and a category first.',
    );
    expect(frontPageBlockReason({ ...ready, tags: [] })).toBe(
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
  it('flags ready photos missing alt or tags only', () => {
    expect(needsDetails({ status: 'ready', alt: 'x', tags: ['Nature'] })).toBe(false);
    expect(needsDetails({ status: 'ready', alt: null, tags: ['Nature'] })).toBe(true);
    expect(needsDetails({ status: 'pending', alt: null, tags: [] })).toBe(false);
  });
});
