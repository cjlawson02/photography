/** Picu-style client selection — separate from ingest `status`. */
export const selectionStatuses = ['none', 'selected', 'approved'] as const;

export type SelectionStatus = (typeof selectionStatuses)[number];
