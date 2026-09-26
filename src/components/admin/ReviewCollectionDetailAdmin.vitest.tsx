import { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminReviewCollectionDetail } from './admin-ssr-test-fixtures.ts';
import ReviewCollectionDetailAdmin from './ReviewCollectionDetailAdmin.tsx';

vi.mock('../../lib/trpc/query-client.ts', () => ({
  getAdminQueryClient: () =>
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
}));

describe('ReviewCollectionDetailAdmin SSR seed', () => {
  it('renders collection slug without Loading when initialDetail is provided', async () => {
    const detail = makeAdminReviewCollectionDetail({ slug: 'ssr-detail-slug' });
    render(
      <ReviewCollectionDetailAdmin collectionId={detail.collection.id} initialDetail={detail} />,
    );

    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    expect(screen.getByText('ssr-detail-slug')).toBeInTheDocument();
    expect(screen.getByText(/No photos in this collection yet/)).toBeInTheDocument();
  });

  it('lets the user focus the title field', async () => {
    const user = userEvent.setup();
    const detail = makeAdminReviewCollectionDetail({ title: 'Engagement' });
    render(
      <ReviewCollectionDetailAdmin collectionId={detail.collection.id} initialDetail={detail} />,
    );

    const titleInput = screen.getByRole('textbox', { name: 'Collection title' });
    await user.click(titleInput);
    expect(titleInput).toHaveFocus();
    expect(titleInput).toHaveValue('Engagement');
  });
});
