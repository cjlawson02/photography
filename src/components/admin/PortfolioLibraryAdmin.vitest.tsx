import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AdminPortfolioPhoto } from '../../lib/admin/trpc-types.ts';
import { makeAdminPortfolioListPage, makeAdminPortfolioPhoto } from './admin-ssr-test-fixtures.ts';
import { stubAdminTrpcFetch } from './admin-trpc-test-fetch.ts';
import PortfolioLibraryAdmin from './PortfolioLibraryAdmin.tsx';

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

const complete = { alt: 'Alt', tags: ['Nature' as const] };

function renderLibrary(photos: AdminPortfolioPhoto[]) {
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const trpc = stubAdminTrpcFetch({
    'portfolio.update': (input) => {
      const { id, data } = input as { id: string; data: Partial<AdminPortfolioPhoto> };
      return { ...byId.get(id)!, ...data };
    },
    'portfolio.bulkUpdate': (input) => {
      const { ids, data } = input as { ids: string[]; data: Partial<AdminPortfolioPhoto> };
      return { items: ids.map((id) => ({ ...byId.get(id)!, ...data })) };
    },
    'portfolio.bulkDelete': (input) => ({ ids: (input as { ids: string[] }).ids }),
    'portfolio.frontPage.list': () => ({ items: [] }),
  });
  render(<PortfolioLibraryAdmin initialPortfolioPage={makeAdminPortfolioListPage(photos)} />);
  return trpc;
}

function tile(name: string) {
  return screen.getByRole('button', { name });
}

function selectionBar() {
  return screen.getByRole('toolbar', { name: 'Selection actions' });
}

describe('PortfolioLibraryAdmin selection', () => {
  it('supports click, shift-click range, and cmd-click toggle', async () => {
    const user = userEvent.setup();
    renderLibrary(['A', 'B', 'C', 'D'].map((title) => makeAdminPortfolioPhoto({ title })));

    await user.click(tile('A'));
    expect(within(selectionBar()).getByText('1 selected')).toBeInTheDocument();

    await user.keyboard('{Shift>}');
    await user.click(tile('C'));
    await user.keyboard('{/Shift}');
    expect(within(selectionBar()).getByText('3 selected')).toBeInTheDocument();
    expect(tile('B')).toHaveAttribute('aria-pressed', 'true');
    expect(tile('D')).toHaveAttribute('aria-pressed', 'false');

    await user.keyboard('{Meta>}');
    await user.click(tile('B'));
    await user.keyboard('{/Meta}');
    expect(within(selectionBar()).getByText('2 selected')).toBeInTheDocument();
    expect(tile('B')).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: 'Select all shown' }));
    expect(within(selectionBar()).getByText('4 selected')).toBeInTheDocument();
  });

  it('filters to Needs details and drops hidden photos from the selection', async () => {
    const user = userEvent.setup();
    renderLibrary([
      makeAdminPortfolioPhoto({ title: 'Done', ...complete }),
      makeAdminPortfolioPhoto({ title: 'Todo', alt: null, tags: ['Nature'] }),
    ]);

    await user.click(screen.getByRole('button', { name: 'Select all shown' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'State' }), 'needsDetails');

    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
    expect(within(tile('Todo')).getByText('Needs details')).toBeInTheDocument();
    expect(within(selectionBar()).getByText('1 selected')).toBeInTheDocument();
  });
});

describe('PortfolioLibraryAdmin inspector', () => {
  it('shows mixed values across a selection and bulk-saves an edited field', async () => {
    const user = userEvent.setup();
    const a = makeAdminPortfolioPhoto({ title: 'A', alt: 'Dunes', tags: ['Beach'] });
    const b = makeAdminPortfolioPhoto({ title: 'B', alt: 'Harbor', tags: ['Beach'] });
    const trpc = renderLibrary([a, b]);

    await user.click(tile('A'));
    await user.keyboard('{Shift>}');
    await user.click(tile('B'));
    await user.keyboard('{/Shift}');

    const inspector = screen.getByRole('region', { name: 'Inspector' });
    const alt = within(inspector).getByRole('textbox', { name: /Alt text/ });
    expect(alt).toHaveValue('');
    expect(alt).toHaveAttribute('placeholder', 'Mixed');
    expect(within(inspector).getByRole('checkbox', { name: 'Beach' })).toBeChecked();
    expect(within(inspector).getByRole('checkbox', { name: 'Nature' })).not.toBeChecked();

    await user.type(alt, 'Coastline');
    await user.tab();

    await waitFor(() => expect(trpc.callsTo('portfolio.bulkUpdate')).toHaveLength(1));
    expect(trpc.callsTo('portfolio.bulkUpdate')[0]!.input).toEqual({
      ids: [a.id, b.id],
      data: { alt: 'Coastline' },
    });
    expect(await within(inspector).findByText('Saved')).toBeInTheDocument();
  });

  it('leaves a mixed field alone when it is focused and left empty', async () => {
    const user = userEvent.setup();
    const trpc = renderLibrary([
      makeAdminPortfolioPhoto({ title: 'A', alt: 'One' }),
      makeAdminPortfolioPhoto({ title: 'B', alt: 'Two' }),
    ]);
    await user.click(screen.getByRole('button', { name: 'Select all shown' }));
    await user.click(screen.getByRole('textbox', { name: /Alt text/ }));
    await user.tab();
    expect(trpc.calls.filter((call) => call.path.startsWith('portfolio.'))).toHaveLength(0);
  });

  it('shows an inline error for an invalid sort order without saving', async () => {
    const user = userEvent.setup();
    const trpc = renderLibrary([makeAdminPortfolioPhoto({ title: 'A' })]);
    await user.click(tile('A'));
    const sort = screen.getByRole('textbox', { name: /Sort order/ });
    await user.type(sort, '1.5');
    await user.tab();
    expect(await screen.findByRole('alert')).toHaveTextContent('whole number');
    expect(trpc.callsTo('portfolio.update')).toHaveLength(0);
  });

  it('explains why a needs-details photo cannot join the front page', async () => {
    const user = userEvent.setup();
    renderLibrary([makeAdminPortfolioPhoto({ title: 'A', alt: null, tags: ['Nature'] })]);
    await user.click(tile('A'));

    const inspector = screen.getByRole('region', { name: 'Inspector' });
    expect(
      within(inspector).getByText(/Can’t join the front page yet — Needs details: add alt text/),
    ).toBeInTheDocument();
    expect(
      within(inspector).queryByRole('button', { name: /Add to front page/ }),
    ).not.toBeInTheDocument();
    expect(
      within(selectionBar()).getByRole('button', { name: /Add to front page/ }),
    ).toBeDisabled();
  });
});

describe('PortfolioLibraryAdmin reversible and destructive actions', () => {
  it('offers undo after unpublishing and republishes on Undo', async () => {
    const user = userEvent.setup();
    const photo = makeAdminPortfolioPhoto({ title: 'A', ...complete });
    const trpc = renderLibrary([photo]);

    await user.click(tile('A'));
    await user.click(within(selectionBar()).getByRole('button', { name: 'Unpublish' }));

    expect(await screen.findByText('Unpublished 1 photo.')).toBeInTheDocument();
    expect(trpc.callsTo('portfolio.update')[0]!.input).toEqual({
      id: photo.id,
      data: { published: false },
    });
    expect(within(tile('A')).getByText('Unpublished')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(trpc.callsTo('portfolio.update')).toHaveLength(2));
    expect(trpc.callsTo('portfolio.update')[1]!.input).toEqual({
      id: photo.id,
      data: { published: true },
    });
    expect(await screen.findByText('Change undone.')).toBeInTheDocument();
  });

  it('confirms delete with plain consequences before removing photos', async () => {
    const user = userEvent.setup();
    const trpc = renderLibrary([
      makeAdminPortfolioPhoto({ title: 'A' }),
      makeAdminPortfolioPhoto({ title: 'B' }),
    ]);

    await user.click(screen.getByRole('button', { name: 'Select all shown' }));
    await user.click(within(selectionBar()).getByRole('button', { name: 'Delete…' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete 2 photos?' });
    expect(dialog).toHaveTextContent('This can’t be undone');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trpc.callsTo('portfolio.bulkDelete')).toHaveLength(0);

    await user.click(within(selectionBar()).getByRole('button', { name: 'Delete…' }));
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(await screen.findByText('Deleted 2 photos.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'A' })).not.toBeInTheDocument();
  });
});
