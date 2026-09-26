import { describe, expect, it } from 'vitest';

import { buildJobStepRail, isTransitionAllowed, jobStepPrimaryAction } from './job-steps.ts';

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
