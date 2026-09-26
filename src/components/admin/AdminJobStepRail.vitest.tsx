import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AdminJobStepRail from './AdminJobStepRail.tsx';
import { jobStepPrimaryAction } from '../../lib/review/job-steps.ts';

describe('AdminJobStepRail', () => {
  it('shows mark shared action on proofs uploaded step', () => {
    render(
      <AdminJobStepRail
        status="proofs_uploaded"
        reviewPath="/review/x"
        primaryAction={jobStepPrimaryAction({
          status: 'proofs_uploaded',
          reviewPath: '/review/x',
          uploadAnchor: '#upload',
          finalsUploadAnchor: '#upload-finals',
          hasReadyFinals: false,
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Mark link shared' })).toBeInTheDocument();
  });
});
