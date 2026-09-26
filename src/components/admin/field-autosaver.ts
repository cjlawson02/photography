export type AutosaveResult = 'saved' | 'skipped' | 'failed';

/**
 * Debounced per-field autosave queue (ADMIN-UX “Saving”). `lastSaved[field] === null` marks a
 * mixed multi-selection value: an empty input then means “leave as is”, not “clear”.
 */
export class FieldAutosaver<F extends string> {
  private readonly timers = new Map<F, ReturnType<typeof setTimeout>>();
  private saver: (field: F, raw: string) => Promise<AutosaveResult> = async () => 'skipped';

  constructor(
    private readonly delayMs: number,
    private readonly lastSaved: Record<F, string | null>,
    private readonly read: (field: F) => string,
  ) {}

  setSaver(saver: (field: F, raw: string) => Promise<AutosaveResult>) {
    this.saver = saver;
  }

  schedule(field: F) {
    clearTimeout(this.timers.get(field));
    this.timers.set(
      field,
      setTimeout(() => void this.flush(field), this.delayMs),
    );
  }

  async flush(field: F): Promise<void> {
    clearTimeout(this.timers.get(field));
    this.timers.delete(field);
    const raw = this.read(field);
    const previous = this.lastSaved[field];
    if (previous === null ? raw.trim() === '' : raw.trim() === previous.trim()) return;
    this.lastSaved[field] = raw;
    if ((await this.saver(field, raw)) !== 'saved') this.lastSaved[field] = previous;
  }

  flushPending() {
    for (const field of this.timers.keys()) void this.flush(field);
  }
}
