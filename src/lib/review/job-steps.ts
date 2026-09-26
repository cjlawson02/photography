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

/** Steps the admin may advance to from the current step (workflows 1–2). */
export const ADMIN_JOB_TRANSITION_TARGETS: Partial<Record<ReviewJobStatus, ReviewJobStatus[]>> = {
  proofs_uploaded: ['shared'],
  picks_submitted: ['editing', 'shared'],
  editing: ['shared', 'finals_delivered'],
  finals_delivered: ['editing', 'closed'],
};

/** Steps where `ingest.presign` accepts `round: 'final'` (Workflow 3). */
export const FINALS_UPLOAD_STATUSES: ReviewJobStatus[] = ['editing', 'finals_delivered'];

export function canUploadFinals(status: ReviewJobStatus): boolean {
  return FINALS_UPLOAD_STATUSES.includes(status);
}

export function isTransitionAllowed(from: ReviewJobStatus, to: ReviewJobStatus): boolean {
  if (from === to) return true;
  const allowed = ADMIN_JOB_TRANSITION_TARGETS[from];
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
  | { kind: 'upload_finals'; label: string; href: string }
  | { kind: 'mark_shared'; label: string; targetStatus: 'shared' }
  | { kind: 'preview_client'; label: string; href: string }
  | { kind: 'preview_download'; label: string; href: string }
  | { kind: 'copy_filenames'; label: string }
  | { kind: 'mark_delivered'; label: string; targetStatus: 'finals_delivered' }
  | { kind: 'mark_closed'; label: string; targetStatus: 'closed' }
  | { kind: 'copy_delivery_message'; label: string }
  | { kind: 'reopen_picks'; label: string; targetStatus: 'shared' }
  | { kind: 'replace_finals'; label: string; targetStatus: 'editing' }
  | { kind: 'none'; label: string };

export function jobStepPrimaryAction(input: {
  status: ReviewJobStatus;
  reviewPath: string;
  uploadAnchor: string;
  finalsUploadAnchor: string;
  hasReadyFinals: boolean;
}): JobStepPrimaryAction {
  const { status, reviewPath, uploadAnchor, finalsUploadAnchor, hasReadyFinals } = input;
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
      return { kind: 'copy_filenames', label: 'Copy filenames for Lightroom' };
    case 'editing':
      return hasReadyFinals
        ? {
            kind: 'mark_delivered',
            label: 'Mark finals delivered',
            targetStatus: 'finals_delivered',
          }
        : { kind: 'upload_finals', label: 'Upload finals', href: finalsUploadAnchor };
    case 'finals_delivered':
      return { kind: 'mark_closed', label: 'Close out shoot', targetStatus: 'closed' };
    case 'closed':
      return { kind: 'preview_download', label: 'Preview download mode', href: reviewPath };
    default:
      return { kind: 'none', label: '—' };
  }
}

/**
 * Shown before the primary action while Editing with ready finals: the admin-only download-mode
 * preview (the public link does not switch until Mark finals delivered).
 */
export function jobStepLeadingAction(input: {
  status: ReviewJobStatus;
  adminPreviewPath: string;
  hasReadyFinals: boolean;
}): JobStepPrimaryAction | null {
  if (input.status === 'editing' && input.hasReadyFinals) {
    return { kind: 'preview_download', label: 'Preview as client', href: input.adminPreviewPath };
  }
  return null;
}

/** Secondary admin actions after the primary one (reopen, preview, replace, notify). */
export function jobStepSecondaryActions(
  status: ReviewJobStatus,
  reviewPath: string,
): JobStepPrimaryAction[] {
  if (status === 'picks_submitted' || status === 'editing') {
    return [{ kind: 'reopen_picks', label: 'Reopen picks', targetStatus: 'shared' }];
  }
  if (status === 'finals_delivered') {
    return [
      { kind: 'preview_download', label: 'Preview download mode', href: reviewPath },
      { kind: 'replace_finals', label: 'Replace finals', targetStatus: 'editing' },
    ];
  }
  if (status === 'closed') {
    return [{ kind: 'copy_delivery_message', label: 'Copy notify message' }];
  }
  return [];
}
