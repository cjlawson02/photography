/** Grid selection (ADMIN-UX “Selection”): click, shift-range, cmd/ctrl-toggle, select all. */
export type GridSelection = {
  ids: ReadonlySet<string>;
  /** Last plain or toggle click; shift-click extends from here. */
  anchor: string | null;
};

export type GridSelectModifiers = {
  shift?: boolean;
  toggle?: boolean;
};

export const EMPTY_GRID_SELECTION: GridSelection = { ids: new Set(), anchor: null };

export function selectInGrid(
  state: GridSelection,
  orderedIds: readonly string[],
  id: string,
  modifiers: GridSelectModifiers = {},
): GridSelection {
  const anchorIndex = state.anchor === null ? -1 : orderedIds.indexOf(state.anchor);
  const targetIndex = orderedIds.indexOf(id);

  if (modifiers.shift && anchorIndex !== -1 && targetIndex !== -1) {
    const [from, to] =
      anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
    const range = orderedIds.slice(from, to + 1);
    const ids = modifiers.toggle ? new Set([...state.ids, ...range]) : new Set(range);
    return { ids, anchor: state.anchor };
  }

  if (modifiers.toggle) {
    const ids = new Set(state.ids);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    return { ids, anchor: id };
  }

  return { ids: new Set([id]), anchor: id };
}

export function selectAllInGrid(orderedIds: readonly string[]): GridSelection {
  return { ids: new Set(orderedIds), anchor: orderedIds[0] ?? null };
}

/** Drop ids no longer visible (filter change, delete) so bulk actions never hit hidden photos. */
export function pruneGridSelection(
  state: GridSelection,
  visibleIds: readonly string[],
): GridSelection {
  const visible = new Set(visibleIds);
  const ids = [...state.ids].filter((id) => visible.has(id));
  if (ids.length === state.ids.size && (state.anchor === null || visible.has(state.anchor))) {
    return state;
  }
  return {
    ids: new Set(ids),
    anchor: state.anchor !== null && visible.has(state.anchor) ? state.anchor : null,
  };
}
