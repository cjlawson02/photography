/** Minimal ingest status set — no persisted error string (log on failure). */
export const photoStatuses = ['pending', 'ready', 'failed'] as const;

export type PhotoStatus = (typeof photoStatuses)[number];
