import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AdminToastProvider, useAdminToast } from './AdminToast.tsx';

function ToastProbe() {
  const { pushToast } = useAdminToast();
  return (
    <button type="button" onClick={() => pushToast('Saved.', { undo: () => undefined })}>
      Show toast
    </button>
  );
}

describe('AdminToast', () => {
  it('queues a toast with undo', async () => {
    const user = userEvent.setup();
    render(
      <AdminToastProvider>
        <ToastProbe />
      </AdminToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    expect(screen.getByText('Saved.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });
});
