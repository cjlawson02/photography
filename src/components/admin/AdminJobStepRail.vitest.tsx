import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdminJobStepRail from './AdminJobStepRail.tsx';
import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';
import { jobStepPrimaryAction } from '../../lib/review/job-steps.ts';

function primaryFor(status: ReviewJobStatus, hasReadyFinals = false) {
  return jobStepPrimaryAction({
    status,
    reviewPath: '/review/x',
    uploadAnchor: '#upload',
    finalsUploadAnchor: '#upload-finals',
    hasReadyFinals,
  });
}

describe('AdminJobStepRail', () => {
  it('shows mark shared action on proofs uploaded step', () => {
    render(
      <AdminJobStepRail
        status="proofs_uploaded"
        reviewPath="/review/x"
        primaryAction={primaryFor('proofs_uploaded')}
      />,
    );
    expect(screen.getByRole('button', { name: 'Mark link shared' })).toBeInTheDocument();
  });

  it('puts Preview as client before Mark finals delivered while editing', () => {
    const { container } = render(
      <AdminJobStepRail
        status="editing"
        reviewPath="/review/x"
        adminPreviewPath="/admin/shoots/c1/preview"
        hasReadyFinals
        primaryAction={primaryFor('editing', true)}
      />,
    );
    const preview = screen.getByRole('link', { name: 'Preview as client' });
    expect(preview).toHaveAttribute('href', '/admin/shoots/c1/preview');
    const actions = [...container.querySelectorAll('a, button')].map((el) => el.textContent);
    expect(actions).toEqual(['Preview as client', 'Mark finals delivered', 'Reopen picks']);
  });

  it('does not offer the admin preview before finals are ready', () => {
    render(
      <AdminJobStepRail
        status="editing"
        reviewPath="/review/x"
        adminPreviewPath="/admin/shoots/c1/preview"
        hasReadyFinals={false}
        primaryAction={primaryFor('editing')}
      />,
    );
    expect(screen.queryByRole('link', { name: 'Preview as client' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Upload finals' })).toBeInTheDocument();
  });

  it('calls onReplaceFinals from the delivered step', async () => {
    const user = userEvent.setup();
    const onReplaceFinals = vi.fn();
    render(
      <AdminJobStepRail
        status="finals_delivered"
        reviewPath="/review/x"
        hasReadyFinals
        primaryAction={primaryFor('finals_delivered', true)}
        onReplaceFinals={onReplaceFinals}
      />,
    );
    expect(screen.getByRole('link', { name: 'Preview download mode' })).toHaveAttribute(
      'href',
      '/review/x',
    );
    await user.click(screen.getByRole('button', { name: 'Replace finals' }));
    expect(onReplaceFinals).toHaveBeenCalledOnce();
  });
});
