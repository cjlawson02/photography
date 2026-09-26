import { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminReviewCollectionDetail } from './admin-ssr-test-fixtures.ts';
import ShootJobAdmin from './ShootJobAdmin.tsx';

vi.mock('../../lib/trpc/query-client.ts', () => ({
  getAdminQueryClient: () =>
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
}));

describe('ShootJobAdmin SSR seed', () => {
  it('renders step rail without Loading when initialDetail is provided', async () => {
    const detail = makeAdminReviewCollectionDetail({ slug: 'ssr-detail-slug', status: 'shared' });
    render(<ShootJobAdmin collectionId={detail.collection.id} initialDetail={detail} />);

    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Shoot job steps' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Alex' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Preview as client' })).toBeInTheDocument();
  });

  it('lets the user focus the person name field', async () => {
    const user = userEvent.setup();
    const detail = makeAdminReviewCollectionDetail({ personName: 'Jordan' });
    render(<ShootJobAdmin collectionId={detail.collection.id} initialDetail={detail} />);

    const personInput = screen.getByRole('textbox', { name: 'Person name' });
    await user.click(personInput);
    expect(personInput).toHaveFocus();
    expect(personInput).toHaveValue('Jordan');
  });
});
