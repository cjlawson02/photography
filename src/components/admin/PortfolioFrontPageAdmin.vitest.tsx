import { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AdminPortfolioPhoto } from '../../lib/admin/trpc-types.ts';
import { makeAdminPortfolioPhoto } from './admin-ssr-test-fixtures.ts';
import { stubAdminTrpcFetch } from './admin-trpc-test-fetch.ts';
import PortfolioFrontPageAdmin from './PortfolioFrontPageAdmin.tsx';

vi.mock('../../lib/trpc/query-client.ts', () => ({
  getAdminQueryClient: () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 30_000 },
        mutations: { retry: false },
      },
    }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(titles: string[], options: { failReorder?: boolean } = {}) {
  const photos = titles.map((title) =>
    makeAdminPortfolioPhoto({ title, alt: title, tags: ['Nature'], frontPage: true }),
  );
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  let serverOrder = photos.map((photo) => photo.id);
  const trpc = stubAdminTrpcFetch({
    'portfolio.frontPage.list': () => ({ items: serverOrder.map((id) => byId.get(id)!) }),
    'portfolio.frontPage.reorder': (input) => {
      if (options.failReorder) throw new Error('boom');
      serverOrder = (input as { orderedIds: string[] }).orderedIds;
      return { orderedIds: serverOrder };
    },
    'portfolio.frontPage.set': (input) => {
      serverOrder = (input as { orderedIds: string[] }).orderedIds;
      return { orderedIds: serverOrder };
    },
    'portfolio.update': (input) => {
      const { id, data } = input as { id: string; data: Partial<AdminPortfolioPhoto> };
      return { ...byId.get(id)!, ...data };
    },
  });
  render(<PortfolioFrontPageAdmin initialFrontPage={{ items: photos }} />);
  return { trpc, photos, ids: photos.map((photo) => photo.id) };
}

function titlesInOrder() {
  const list = screen.getByRole('list', { name: 'Front-page order' });
  return within(list)
    .getAllByRole('button', { name: /^Move .* later$/ })
    .map((button) => button.getAttribute('aria-label')!.replace(/^Move | later$/g, ''));
}

describe('PortfolioFrontPageAdmin reorder', () => {
  it('reorders with the keyboard-accessible arrow buttons', async () => {
    const user = userEvent.setup();
    const { trpc, ids } = setup(['A', 'B', 'C']);

    await user.click(screen.getByRole('button', { name: 'Move C earlier' }));

    expect(titlesInOrder()).toEqual(['A', 'C', 'B']);
    await waitFor(() => expect(trpc.callsTo('portfolio.frontPage.reorder')).toHaveLength(1));
    expect(trpc.callsTo('portfolio.frontPage.reorder')[0]!.input).toEqual({
      orderedIds: [ids[0], ids[2], ids[1]],
    });
    expect(await screen.findByText('Order saved')).toBeInTheDocument();
  });

  it('reorders by drag and drop', async () => {
    const { trpc, ids } = setup(['A', 'B', 'C']);
    const items = within(screen.getByRole('list', { name: 'Front-page order' })).getAllByRole(
      'listitem',
    );

    // user-event has no HTML5 drag-and-drop support; fireEvent dispatches the native DnD events.
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(items[0]!, { dataTransfer });
    fireEvent.dragOver(items[2]!, { dataTransfer });
    fireEvent.drop(items[2]!, { dataTransfer });

    expect(titlesInOrder()).toEqual(['B', 'C', 'A']);
    await waitFor(() =>
      expect(trpc.callsTo('portfolio.frontPage.reorder')[0]?.input).toEqual({
        orderedIds: [ids[1], ids[2], ids[0]],
      }),
    );
  });

  it('rolls back and reports when the order cannot be saved', async () => {
    const user = userEvent.setup();
    setup(['A', 'B'], { failReorder: true });

    await user.click(screen.getByRole('button', { name: 'Move A later' }));

    expect(await screen.findByText(/Couldn’t save the new order/)).toBeInTheDocument();
    expect(titlesInOrder()).toEqual(['A', 'B']);
  });
});

describe('PortfolioFrontPageAdmin remove', () => {
  it('removes with an undo toast that restores the former position', async () => {
    const user = userEvent.setup();
    const { trpc, ids } = setup(['A', 'B', 'C']);

    const tileB = screen.getByRole('button', { name: 'Move B later' }).closest('li')!;
    await user.click(within(tileB).getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('Removed 1 photo from the front page.')).toBeInTheDocument();
    expect(trpc.callsTo('portfolio.frontPage.set')[0]!.input).toEqual({
      orderedIds: [ids[0], ids[2]],
    });
    await waitFor(() => expect(titlesInOrder()).toEqual(['A', 'C']));

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(await screen.findByText('Restored to the front page.')).toBeInTheDocument();
    expect(trpc.callsTo('portfolio.frontPage.set')[1]!.input).toEqual({
      orderedIds: ids,
      heroIds: [],
    });
    await waitFor(() => expect(titlesInOrder()).toEqual(['A', 'B', 'C']));
  });
});
