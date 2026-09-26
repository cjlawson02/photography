import { describe, expect, it } from 'vitest';

import { moveIdOnto, moveItem, reinsertIds } from './front-page-order.ts';

describe('moveItem', () => {
  it('moves up and down and ignores out-of-range targets', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
  });
});

describe('moveIdOnto', () => {
  it('drops the dragged photo into the target slot', () => {
    expect(moveIdOnto(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
    expect(moveIdOnto(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });
});

describe('reinsertIds', () => {
  it('restores removed photos at their former positions', () => {
    expect(
      reinsertIds(
        ['b', 'd'],
        [
          { id: 'c', index: 2 },
          { id: 'a', index: 0 },
        ],
      ),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('clamps to the end when the set shrank meanwhile', () => {
    expect(reinsertIds(['a'], [{ id: 'z', index: 5 }])).toEqual(['a', 'z']);
  });
});
