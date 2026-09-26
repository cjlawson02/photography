import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdminPrimaryButton from './AdminPrimaryButton.tsx';

describe('AdminPrimaryButton', () => {
  it('invokes onClick when activated via keyboard or pointer', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<AdminPrimaryButton onClick={onClick}>Save</AdminPrimaryButton>);

    const button = screen.getByRole('button', { name: 'Save' });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <AdminPrimaryButton onClick={onClick} disabled>
        Save
      </AdminPrimaryButton>,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
