import { describe, expect, it } from 'vitest';

import { findMatchedPickId } from './match-final-to-pick.ts';

describe('findMatchedPickId', () => {
  it('returns the proof id when exactly one basename matches', () => {
    const id = findMatchedPickId({ originalFilename: 'IMG_0001.JPG' }, [
      { id: 'proof-1', round: 'proof', originalFilename: 'img_0001.jpg' },
      { id: 'proof-2', round: 'proof', originalFilename: 'other.jpg' },
    ]);
    expect(id).toBe('proof-1');
  });

  it('returns null when no unique match', () => {
    expect(
      findMatchedPickId({ originalFilename: 'x.jpg' }, [
        { id: 'a', round: 'proof', originalFilename: 'y.jpg' },
      ]),
    ).toBeNull();
  });
});
