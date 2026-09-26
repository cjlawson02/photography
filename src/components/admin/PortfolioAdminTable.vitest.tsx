import { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminPortfolioListPage, makeAdminPortfolioPhoto } from './admin-ssr-test-fixtures.ts';
import PortfolioAdminTable from './PortfolioAdminTable.tsx';

vi.mock('../../lib/trpc/query-client.ts', () => ({
  getAdminQueryClient: () =>
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
}));

describe('PortfolioAdminTable SSR seed', () => {
  it('shows seeded portfolio row without Loading', () => {
    const photo = makeAdminPortfolioPhoto({ title: 'Harbor lights' });
    const page = makeAdminPortfolioListPage([photo]);
    render(<PortfolioAdminTable initialPortfolioPage={page} />);

    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Harbor lights')).toBeInTheDocument();
    expect(screen.getByText('1 photo(s) shown.')).toBeInTheDocument();
  });

  it('toggles stale-pending filter with userEvent', async () => {
    const user = userEvent.setup();
    const page = makeAdminPortfolioListPage();
    render(<PortfolioAdminTable initialPortfolioPage={page} />);

    const checkbox = screen.getByRole('checkbox', { name: /Stale pending only/i });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
