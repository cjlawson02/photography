import { describe, expect, it } from 'vitest';

import { areClientPicksLocked, countSubmittedPicks } from './picks-lock.ts';

describe('picks-lock', () => {
  it('locks after picks submitted step', () => {
    expect(areClientPicksLocked('shared')).toBe(false);
    expect(areClientPicksLocked('picks_submitted')).toBe(true);
  });

  it('counts selected and approved picks', () => {
    expect(
      countSubmittedPicks([
        { selectionStatus: 'none' },
        { selectionStatus: 'selected' },
        { selectionStatus: 'approved' },
      ]),
    ).toBe(2);
  });
});
