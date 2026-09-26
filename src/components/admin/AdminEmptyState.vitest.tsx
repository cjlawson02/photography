import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AdminEmptyState from './AdminEmptyState.tsx';

describe('AdminEmptyState', () => {
  it('renders title and guidance with start alignment', () => {
    render(
      <AdminEmptyState title="No items" align="start">
        <p>Upload something first.</p>
      </AdminEmptyState>,
    );

    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Upload something first.')).toBeInTheDocument();
    const panel = screen.getByText('No items').closest('div');
    expect(panel).toHaveClass('text-left');
  });

  it('centers body copy by default', () => {
    render(
      <AdminEmptyState title="Empty table">
        <span>Nothing here</span>
      </AdminEmptyState>,
    );

    expect(screen.getByText('Nothing here').closest('div')).toHaveClass('mx-auto');
  });
});
