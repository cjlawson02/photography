import { describe, expect, it } from 'vitest';

import {
  buildJobStepRail,
  canUploadFinals,
  isTransitionAllowed,
  jobStepLeadingAction,
  jobStepPrimaryAction,
  jobStepSecondaryActions,
} from './job-steps.ts';

describe('job-steps', () => {
  it('marks earlier steps complete on the rail', () => {
    const rail = buildJobStepRail('shared');
    expect(rail.find((s) => s.status === 'setup')?.state).toBe('complete');
    expect(rail.find((s) => s.status === 'shared')?.state).toBe('current');
    expect(rail.find((s) => s.status === 'editing')?.state).toBe('upcoming');
  });

  it('allows mark shared from proofs uploaded only', () => {
    expect(isTransitionAllowed('proofs_uploaded', 'shared')).toBe(true);
    expect(isTransitionAllowed('picks_submitted', 'editing')).toBe(true);
    expect(isTransitionAllowed('setup', 'shared')).toBe(false);
  });

  it('only allows finals uploads while editing or delivered', () => {
    expect(canUploadFinals('editing')).toBe(true);
    expect(canUploadFinals('finals_delivered')).toBe(true);
    expect(canUploadFinals('picks_submitted')).toBe(false);
    expect(canUploadFinals('closed')).toBe(false);
  });

  it('leads with the admin preview only while editing with ready finals', () => {
    const adminPreviewPath = '/admin/shoots/c1/preview';
    expect(
      jobStepLeadingAction({ status: 'editing', adminPreviewPath, hasReadyFinals: true }),
    ).toEqual({ kind: 'preview_download', label: 'Preview as client', href: adminPreviewPath });
    expect(
      jobStepLeadingAction({ status: 'editing', adminPreviewPath, hasReadyFinals: false }),
    ).toBeNull();
    expect(
      jobStepLeadingAction({ status: 'finals_delivered', adminPreviewPath, hasReadyFinals: true }),
    ).toBeNull();
  });

  it('offers Replace finals after delivery', () => {
    expect(jobStepSecondaryActions('finals_delivered', '/review/x').map((a) => a.kind)).toEqual([
      'preview_download',
      'replace_finals',
    ]);
    expect(isTransitionAllowed('finals_delivered', 'editing')).toBe(true);
  });

  it('suggests upload proofs during setup', () => {
    const action = jobStepPrimaryAction({
      status: 'setup',
      reviewPath: '/review/x',
      uploadAnchor: '#upload',
      finalsUploadAnchor: '#upload-finals',
      hasReadyFinals: false,
    });
    expect(action.kind).toBe('upload_proofs');
  });
});
