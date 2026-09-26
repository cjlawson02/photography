import { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminReviewCollection } from './admin-ssr-test-fixtures.ts';
import ReviewCollectionsAdmin from './ReviewCollectionsAdmin.tsx';

vi.mock('../../lib/trpc/query-client.ts', () => ({
  getAdminQueryClient: () =>
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
}));

describe('ReviewCollectionsAdmin SSR seed', () => {
  it('lists seeded collections without Loading', () => {
    const row = makeAdminReviewCollection({ slug: 'seeded-slug-xyz', personName: 'Sam' });
    render(<ReviewCollectionsAdmin initialCollections={[row]} />);

    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
    expect(screen.getByText('1 collection(s).')).toBeInTheDocument();
  });

  it('navigates via Open job with userEvent', async () => {
    const user = userEvent.setup();
    const row = makeAdminReviewCollection({ slug: 'nav-slug' });
    render(<ReviewCollectionsAdmin initialCollections={[row]} />);

    const openJob = screen.getByRole('link', { name: 'Open job' });
    await user.click(openJob);
    expect(openJob).toHaveAttribute('href', `/admin/shoots/${row.id}`);
  });
});
