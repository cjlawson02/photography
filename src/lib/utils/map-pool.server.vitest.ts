import { describe, expect, it, vi } from 'vitest';

import { mapPool } from './map-pool.ts';

describe('mapPool', () => {
  it('preserves order and caps concurrency', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const started: number[] = [];

    const results = await mapPool([1, 2, 3, 4, 5, 6], 2, async (value, index) => {
      started.push(index);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return value * 10;
    });

    expect(results).toEqual([10, 20, 30, 40, 50, 60]);
    expect(maxInFlight).toBe(2);
    expect(started).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('returns an empty array for empty input without calling the worker', async () => {
    const worker = vi.fn();
    await expect(mapPool([], 5, worker)).resolves.toEqual([]);
    expect(worker).not.toHaveBeenCalled();
  });
});
