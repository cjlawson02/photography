import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';

export type JobStepDefinition = {
  status: ReviewJobStatus;
  label: string;
  description: string;
};

/** Ordered pipeline steps for the shoot job rail (ADMIN-UX lifecycles). */
export const JOB_STEP_DEFINITIONS: JobStepDefinition[] = [
  {
    status: 'setup',
    label: 'Setup',
    description: 'Title, person name, optional expiry and notes. Upload proofs when ready.',
  },
  {
    status: 'proofs_uploaded',
    label: 'Proofs uploaded',
    description: 'Proofs are in review storage and ingest is ready (or finishing).',
  },
  {
    status: 'shared',
    label: 'Shared',
    description: 'Link sent — client is choosing favorites on the public review page.',
  },
  {
    status: 'picks_submitted',
    label: 'Picks submitted',
    description: 'Client finished choosing; picks are locked until you reopen.',
  },
  {
    status: 'editing',
    label: 'Editing',
    description: 'Finish edits offline in Lightroom using exported filenames.',
  },
  {
    status: 'finals_delivered',
    label: 'Finals delivered',
    description: 'Finals uploaded; client can download from the same link.',
  },
  {
    status: 'closed',
    label: 'Closed',
    description: 'Job finished; retention and purge choices apply.',
  },
];

const statusOrder = new Map(JOB_STEP_DEFINITIONS.map((step, index) => [step.status, index]));

export function jobStepIndex(status: ReviewJobStatus): number {
  return statusOrder.get(status) ?? 0;
}

export function jobStepLabel(status: ReviewJobStatus): string {
  return JOB_STEP_DEFINITIONS.find((step) => step.status === status)?.label ?? status;
}

/** Steps the admin may advance to from the current step in Phase A1 (workflows 1–2 setup). */
export const A1_ADMIN_TRANSITION_TARGETS: Partial<Record<ReviewJobStatus, ReviewJobStatus[]>> = {
  proofs_uploaded: ['shared'],
};

export function isTransitionAllowed(from: ReviewJobStatus, to: ReviewJobStatus): boolean {
  if (from === to) return true;
  const allowed = A1_ADMIN_TRANSITION_TARGETS[from];
  return allowed?.includes(to) ?? false;
}

export type JobStepRailItem = JobStepDefinition & {
  state: 'complete' | 'current' | 'upcoming';
};

export function buildJobStepRail(current: ReviewJobStatus): JobStepRailItem[] {
  const currentIndex = jobStepIndex(current);
  return JOB_STEP_DEFINITIONS.map((step, index) => ({
    ...step,
    state: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming',
  }));
}

export type JobStepPrimaryAction =
  | { kind: 'upload_proofs'; label: string; href: string }
  | { kind: 'mark_shared'; label: string; targetStatus: 'shared' }
  | { kind: 'preview_client'; label: string; href: string }
  | { kind: 'none'; label: string };

export function jobStepPrimaryAction(input: {
  status: ReviewJobStatus;
  reviewPath: string;
  uploadAnchor: string;
}): JobStepPrimaryAction {
  const { status, reviewPath, uploadAnchor } = input;
  switch (status) {
    case 'setup':
      return { kind: 'upload_proofs', label: 'Upload proofs', href: uploadAnchor };
    case 'proofs_uploaded':
      return {
        kind: 'mark_shared',
        label: 'Mark link shared',
        targetStatus: 'shared',
      };
    case 'shared':
      return { kind: 'preview_client', label: 'Preview as client', href: reviewPath };
    case 'picks_submitted':
    case 'editing':
    case 'finals_delivered':
    case 'closed':
      return { kind: 'none', label: 'Next actions arrive in a later admin phase.' };
    default:
      return { kind: 'none', label: '—' };
  }
}
