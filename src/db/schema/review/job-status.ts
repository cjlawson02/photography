/** Client shoot job step — ADMIN-UX lifecycles (distinct from ingest `status`). */
export const reviewJobStatuses = [
  'setup',
  'proofs_uploaded',
  'shared',
  'picks_submitted',
  'editing',
  'finals_delivered',
  'closed',
] as const;

export type ReviewJobStatus = (typeof reviewJobStatuses)[number];
