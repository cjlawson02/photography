export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) {
    return [...items];
  }
  const next = [...items];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed!);
  return next;
}

/** Drag-and-drop: `draggedId` takes `targetId`'s slot; the rest shift toward the gap. */
export function moveIdOnto(ids: readonly string[], draggedId: string, targetId: string): string[] {
  return moveItem(ids, ids.indexOf(draggedId), ids.indexOf(targetId));
}

/** Undo removal: put each id back at its former index (clamped to the current length). */
export function reinsertIds(
  currentIds: readonly string[],
  removed: readonly { id: string; index: number }[],
): string[] {
  const next = currentIds.filter((id) => !removed.some((entry) => entry.id === id));
  for (const entry of removed.toSorted((a, b) => a.index - b.index)) {
    next.splice(Math.min(entry.index, next.length), 0, entry.id);
  }
  return next;
}
