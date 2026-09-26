import { describe, expect, it } from 'vitest';

import { computeMosaicLayout, type MosaicOptions } from './mosaic-layout.ts';

const options: MosaicOptions = {
  containerWidth: 1200,
  gap: 8,
  targetRowHeight: 260,
  maxSlots: 3,
  minItemHeight: 120,
};

describe('computeMosaicLayout', () => {
  it('places every photo exactly once, in order', () => {
    const ratios = [1.5, 0.67, 1.5, 1.5, 0.67, 1.78, 1.5, 0.67, 0.67, 1.5];
    const layout = computeMosaicLayout(ratios, options);
    expect(layout.items.map((item) => item.index)).toEqual(ratios.map((_, i) => i));
  });

  it('preserves each photo aspect ratio', () => {
    const ratios = [1.5, 0.67, 1.5, 1.5, 0.67, 1.78, 1.33];
    const layout = computeMosaicLayout(ratios, options);
    for (const item of layout.items) {
      expect(item.width / item.height).toBeCloseTo(ratios[item.index], 5);
    }
  });

  it('keeps items inside the container width', () => {
    const ratios = [0.67, 1.5, 1.5, 0.67, 0.67, 1.5, 1.78, 1.5, 0.67];
    const layout = computeMosaicLayout(ratios, options);
    for (const item of layout.items) {
      expect(item.left + item.width).toBeLessThanOrEqual(options.containerWidth + 0.5);
    }
  });

  it('stacks landscapes beside a portrait in a double row', () => {
    const ratios = [0.67, 1.5, 1.5, 0.67];
    const layout = computeMosaicLayout(ratios, options);
    const [portrait, first, second] = layout.items;
    expect(first.left).toBeCloseTo(second.left, 5);
    expect(second.top).toBeGreaterThan(first.top);
    expect(first.height + second.height + options.gap).toBeCloseTo(portrait.height, 5);
  });

  it('returns an empty layout for no photos', () => {
    expect(computeMosaicLayout([], options)).toEqual({ width: 1200, height: 0, items: [] });
  });
});
