import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FieldAutosaver } from './field-autosaver.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(initial: Record<'alt', string | null>, result: 'saved' | 'failed' = 'saved') {
  const values = { alt: initial.alt ?? '' };
  const saver = vi.fn(async () => result);
  const autosaver = new FieldAutosaver(500, { ...initial }, (field: 'alt') => values[field]);
  autosaver.setSaver(saver);
  return { values, saver, autosaver };
}

describe('FieldAutosaver', () => {
  it('debounces rapid edits into one save', async () => {
    const { values, saver, autosaver } = setup({ alt: 'Old' });
    values.alt = 'N';
    autosaver.schedule('alt');
    values.alt = 'New';
    autosaver.schedule('alt');
    await vi.advanceTimersByTimeAsync(499);
    expect(saver).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(saver).toHaveBeenCalledExactlyOnceWith('alt', 'New');
  });

  it('skips unchanged values and retries after a failed save', async () => {
    const { values, saver, autosaver } = setup({ alt: 'Same' }, 'failed');
    await autosaver.flush('alt');
    expect(saver).not.toHaveBeenCalled();
    values.alt = 'Changed';
    await autosaver.flush('alt');
    await autosaver.flush('alt');
    expect(saver).toHaveBeenCalledTimes(2);
  });

  it('treats an empty mixed field as untouched', async () => {
    const { saver, autosaver } = setup({ alt: null });
    await autosaver.flush('alt');
    expect(saver).not.toHaveBeenCalled();
  });

  it('flushes pending edits (e.g. when the selection changes)', async () => {
    const { values, saver, autosaver } = setup({ alt: '' });
    values.alt = 'Typed';
    autosaver.schedule('alt');
    autosaver.flushPending();
    await vi.runAllTimersAsync();
    expect(saver).toHaveBeenCalledExactlyOnceWith('alt', 'Typed');
  });
});
