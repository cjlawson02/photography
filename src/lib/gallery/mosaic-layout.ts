/**
 * Nested-mosaic layout: justified rows where a row slot may hold two stacked
 * landscapes, so a portrait can stand the full height of a "double" row beside them.
 * Photos keep their native aspect ratio and their original order.
 */

export type MosaicOptions = {
  containerWidth: number;
  gap: number;
  /** Target height of a regular row; double rows target `2 * targetRowHeight + gap`. */
  targetRowHeight: number;
  /** Max side-by-side slots per row (a stack counts as one slot). */
  maxSlots: number;
  /** Stacked photos smaller than this are rejected. */
  minItemHeight: number;
};

export type MosaicItem = {
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type MosaicLayout = {
  width: number;
  height: number;
  items: MosaicItem[];
};

type Slot = { kind: 'single'; index: number } | { kind: 'stack'; indices: [number, number] };

type RowPlan = { slots: Slot[]; height: number; cost: number };

/** Squares and wider can stack; stacking portraits makes slivers. */
const STACKABLE_MIN_RATIO = 0.95;
/** Nudge toward double rows so the layout reads freeform rather than strictly row-based. */
const STACK_ROW_BONUS = 0.08;
const LAST_ROW_GAP_WEIGHT = 2;

function slotGroupings(ratios: readonly number[], start: number, end: number, maxSlots: number) {
  const out: Slot[][] = [];
  const walk = (at: number, acc: Slot[]) => {
    if (at === end) {
      out.push(acc);
      return;
    }
    if (acc.length === maxSlots) return;
    walk(at + 1, [...acc, { kind: 'single', index: at }]);
    if (
      at + 1 < end &&
      ratios[at] >= STACKABLE_MIN_RATIO &&
      ratios[at + 1] >= STACKABLE_MIN_RATIO
    ) {
      walk(at + 2, [...acc, { kind: 'stack', indices: [at, at + 1] }]);
    }
  };
  walk(start, []);
  return out;
}

/** Row height at which the slots exactly fill `width` (linear in height). */
function solveRowHeight(slots: Slot[], ratios: readonly number[], width: number, gap: number) {
  let singles = 0;
  let stacks = 0;
  for (const slot of slots) {
    if (slot.kind === 'single') {
      singles += ratios[slot.index];
    } else {
      const [a, b] = slot.indices;
      stacks += 1 / (1 / ratios[a] + 1 / ratios[b]);
    }
  }
  // width = h * singles + (h - gap) * stacks + (slots - 1) * gap
  return (width - (slots.length - 1) * gap + gap * stacks) / (singles + stacks);
}

function planRow(
  slots: Slot[],
  ratios: readonly number[],
  options: MosaicOptions,
  isLast: boolean,
): RowPlan | null {
  const { containerWidth, gap, targetRowHeight, minItemHeight } = options;
  const hasStack = slots.some((slot) => slot.kind === 'stack');
  const target = hasStack ? targetRowHeight * 2 + gap : targetRowHeight;
  let height = solveRowHeight(slots, ratios, containerWidth, gap);

  if (hasStack) {
    for (const slot of slots) {
      if (slot.kind !== 'stack') continue;
      const [a, b] = slot.indices;
      const slotWidth = (height - gap) / (1 / ratios[a] + 1 / ratios[b]);
      if (slotWidth / ratios[a] < minItemHeight || slotWidth / ratios[b] < minItemHeight) {
        return null;
      }
    }
  }

  const lastRowCap = targetRowHeight * 2 + gap;
  if (isLast && height > lastRowCap) {
    // Too few photos to fill the width even at double height: cap it and penalize the empty space.
    const unfilled = 1 - lastRowCap / height;
    return { slots, height: lastRowCap, cost: unfilled * unfilled * LAST_ROW_GAP_WEIGHT };
  }

  const deviation = (height - target) / target;
  const cost = deviation * deviation - (hasStack ? STACK_ROW_BONUS : 0);
  return { slots, height, cost };
}

export function computeMosaicLayout(
  ratios: readonly number[],
  options: MosaicOptions,
): MosaicLayout {
  const n = ratios.length;
  const { containerWidth, gap, maxSlots } = options;
  if (n === 0 || containerWidth <= 0) return { width: containerWidth, height: 0, items: [] };

  const maxSpan = maxSlots * 2;
  const best: { cost: number; row: RowPlan | null; from: number }[] = Array.from(
    { length: n + 1 },
    () => ({ cost: Number.POSITIVE_INFINITY, row: null, from: -1 }),
  );
  best[0] = { cost: 0, row: null, from: -1 };

  for (let start = 0; start < n; start += 1) {
    if (!Number.isFinite(best[start].cost)) continue;
    for (let end = start + 1; end <= Math.min(n, start + maxSpan); end += 1) {
      const isLast = end === n;
      for (const slots of slotGroupings(ratios, start, end, maxSlots)) {
        const row = planRow(slots, ratios, options, isLast);
        if (!row) continue;
        const total = best[start].cost + row.cost;
        if (total < best[end].cost) best[end] = { cost: total, row, from: start };
      }
    }
  }

  const rows: RowPlan[] = [];
  for (let at = n; at > 0; at = best[at].from) {
    const row = best[at].row;
    if (!row) break;
    rows.unshift(row);
  }

  const items: MosaicItem[] = [];
  let top = 0;
  for (const row of rows) {
    const rowWidth = row.slots.reduce(
      (sum, slot) => {
        if (slot.kind === 'single') return sum + row.height * ratios[slot.index];
        const [a, b] = slot.indices;
        return sum + (row.height - gap) / (1 / ratios[a] + 1 / ratios[b]);
      },
      gap * (row.slots.length - 1),
    );
    // Only a capped last row is narrower than the container; center it.
    let left = Math.max(0, (containerWidth - rowWidth) / 2);
    for (const slot of row.slots) {
      if (slot.kind === 'single') {
        const width = row.height * ratios[slot.index];
        items.push({ index: slot.index, left, top, width, height: row.height });
        left += width + gap;
      } else {
        const [a, b] = slot.indices;
        const width = (row.height - gap) / (1 / ratios[a] + 1 / ratios[b]);
        const heightA = width / ratios[a];
        items.push({ index: a, left, top, width, height: heightA });
        items.push({ index: b, left, top: top + heightA + gap, width, height: width / ratios[b] });
        left += width + gap;
      }
    }
    top += row.height + gap;
  }

  items.sort((x, y) => x.index - y.index);
  return { width: containerWidth, height: Math.max(0, top - gap), items };
}
