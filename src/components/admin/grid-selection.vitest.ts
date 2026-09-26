import { describe, expect, it } from 'vitest';

import {
  EMPTY_GRID_SELECTION,
  pruneGridSelection,
  selectAllInGrid,
  selectInGrid,
} from './grid-selection.ts';

const ids = ['a', 'b', 'c', 'd', 'e'];

function selected(state: { ids: ReadonlySet<string> }) {
  return [...state.ids].toSorted();
}

describe('selectInGrid', () => {
  it('plain click selects only that photo', () => {
    const state = selectInGrid(selectAllInGrid(ids), ids, 'c');
    expect(selected(state)).toEqual(['c']);
    expect(state.anchor).toBe('c');
  });

  it('shift-click selects the range from the anchor in either direction', () => {
    const anchored = selectInGrid(EMPTY_GRID_SELECTION, ids, 'b');
    expect(selected(selectInGrid(anchored, ids, 'd', { shift: true }))).toEqual(['b', 'c', 'd']);
    const fromD = selectInGrid(EMPTY_GRID_SELECTION, ids, 'd');
    expect(selected(selectInGrid(fromD, ids, 'a', { shift: true }))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('shift-click keeps the anchor so the range can be adjusted', () => {
    let state = selectInGrid(EMPTY_GRID_SELECTION, ids, 'b');
    state = selectInGrid(state, ids, 'e', { shift: true });
    state = selectInGrid(state, ids, 'c', { shift: true });
    expect(selected(state)).toEqual(['b', 'c']);
  });

  it('cmd/ctrl-click toggles without clearing others', () => {
    let state = selectInGrid(EMPTY_GRID_SELECTION, ids, 'a');
    state = selectInGrid(state, ids, 'c', { toggle: true });
    expect(selected(state)).toEqual(['a', 'c']);
    state = selectInGrid(state, ids, 'a', { toggle: true });
    expect(selected(state)).toEqual(['c']);
  });

  it('cmd+shift adds a range to the existing selection', () => {
    let state = selectInGrid(EMPTY_GRID_SELECTION, ids, 'a');
    state = selectInGrid(state, ids, 'd', { toggle: true });
    state = selectInGrid(state, ids, 'e', { shift: true, toggle: true });
    expect(selected(state)).toEqual(['a', 'd', 'e']);
  });

  it('shift-click without an anchor behaves like a plain click', () => {
    expect(selected(selectInGrid(EMPTY_GRID_SELECTION, ids, 'c', { shift: true }))).toEqual(['c']);
  });
});

describe('pruneGridSelection', () => {
  it('drops hidden ids and a hidden anchor', () => {
    const state = pruneGridSelection(selectAllInGrid(ids), ['b', 'c']);
    expect(selected(state)).toEqual(['b', 'c']);
    expect(state.anchor).toBeNull();
  });

  it('returns the same object when nothing changes', () => {
    const state = selectInGrid(EMPTY_GRID_SELECTION, ids, 'b');
    expect(pruneGridSelection(state, ids)).toBe(state);
  });
});
