/** Immutable Set helpers for React state updaters. */

export function addToSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  next.add(value);
  return next;
}

export function removeFromSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  next.delete(value);
  return next;
}
