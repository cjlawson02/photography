import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AdminStatusLine from './AdminStatusLine.tsx';

describe('AdminStatusLine', () => {
  it('exposes status text in an aria-live region', () => {
    render(<AdminStatusLine>Loading…</AdminStatusLine>);

    const line = screen.getByText('Loading…');
    expect(line).toHaveAttribute('aria-live', 'polite');
  });
});
