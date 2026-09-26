import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
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

  it('offers the admin download preview before Mark finals delivered while editing', () => {
    const detail = makeAdminReviewCollectionDetail({ status: 'editing' });
    detail.finals.readyCount = 1;
    render(<ShootJobAdmin collectionId={detail.collection.id} initialDetail={detail} />);

    const rail = screen.getByRole('region', { name: 'Shoot job steps' });
    const preview = within(rail).getByRole('link', { name: 'Preview as client' });
    expect(preview).toHaveAttribute('href', `/admin/shoots/${detail.collection.id}/preview`);
    const markDelivered = within(rail).getByRole('button', { name: 'Mark finals delivered' });
    expect(preview.compareDocumentPosition(markDelivered)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByRole('region', { name: 'Upload delivery finals' })).toBeInTheDocument();
  });

  it('hides the finals upload section once the shoot is closed', () => {
    const detail = makeAdminReviewCollectionDetail({ status: 'closed' });
    render(<ShootJobAdmin collectionId={detail.collection.id} initialDetail={detail} />);
    expect(screen.queryByRole('region', { name: 'Upload delivery finals' })).toBeNull();
  });

  it('confirms Replace finals and moves the job back to editing', async () => {
    const user = userEvent.setup();
    const detail = makeAdminReviewCollectionDetail({ status: 'finals_delivered' });
    detail.finals.readyCount = 1;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const data = url.includes('review.collections.transition')
        ? { ...detail.collection, status: 'editing' }
        : detail;
      return new Response(JSON.stringify([{ result: { data } }]), {
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchSpy);
    try {
      render(<ShootJobAdmin collectionId={detail.collection.id} initialDetail={detail} />);
      const replace = screen.getByRole('button', { name: 'Replace finals' });

      const transitionCalls = () =>
        (fetchSpy.mock.calls as unknown as [string, RequestInit][]).filter(([url]) =>
          String(url).includes('review.collections.transition'),
        );

      await user.click(replace);
      expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/stops offering downloads/));
      expect(transitionCalls()).toHaveLength(0);

      await user.click(replace);
      await waitFor(() => expect(transitionCalls()).toHaveLength(1));
      const [, init] = transitionCalls()[0]!;
      expect(JSON.parse(String(init.body))).toEqual({
        0: { id: detail.collection.id, to: 'editing' },
      });
    } finally {
      confirmSpy.mockRestore();
      vi.unstubAllGlobals();
    }
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
