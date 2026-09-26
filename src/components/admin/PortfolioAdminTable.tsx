import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { PortfolioPhotoAdminUpdateBody } from '../../lib/admin/portfolio-schemas.ts';
import type { AdminPortfolioListPage } from '../../lib/admin/trpc-types.ts';
import { requestReprocess } from '../../lib/ingest/browser-upload.ts';
<<<<<<< HEAD
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
=======
import AdminEmptyState from './AdminEmptyState.tsx';
>>>>>>> bc560e2 (feat(admin): empty states and ingest guidance (P2.5 P3 partial))
import PortfolioRow from './PortfolioRow.tsx';

const portfolioListInfiniteQueryConfig = {
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage: AdminPortfolioListPage) => lastPage.nextCursor,
};

function addBusyId(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  next.add(id);
  return next;
}

function removeBusyId(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  next.delete(id);
  return next;
}

function PortfolioAdminTableInner() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());

  const listInfiniteQueryOptions = trpc.portfolio.list.infiniteQueryOptions(
    {},
    portfolioListInfiniteQueryConfig,
  );

  const listQuery = useInfiniteQuery(listInfiniteQueryOptions);

  const photos = listQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const listStatus = listQuery.isPending
    ? 'Loading…'
    : listQuery.isError
      ? listQuery.error instanceof Error
        ? listQuery.error.message
        : String(listQuery.error)
      : photos.length === 0
<<<<<<< HEAD
        ? 'No portfolio photos yet — upload via Upload.'
        : `${photos.length} photo(s) shown${listQuery.hasNextPage ? ' — load more for older photos.' : '.'}`;

  const statusMessage = actionStatus !== null ? actionStatus : listStatus;

  const updateListCache = (
    updater: (items: AdminPortfolioListPage['items']) => AdminPortfolioListPage['items'],
  ) => {
    queryClient.setQueryData(listInfiniteQueryOptions.queryKey, (current) => {
      if (!current) return current;
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: updater(page.items),
        })),
      };
    });
  };
=======
        ? 'No portfolio photos yet.'
        : `${photos.length} photo(s).`;

  const statusMessage = actionStatus !== null ? actionStatus : listStatus;

  const showEmptyState =
    listQuery.isSuccess && !listQuery.isError && photos.length === 0 && actionStatus === null;
>>>>>>> bc560e2 (feat(admin): empty states and ingest guidance (P2.5 P3 partial))

  const updateMutation = useMutation(
    trpc.portfolio.update.mutationOptions({
      onSuccess: (updated) => {
        updateListCache((items) => items.map((row) => (row.id === updated.id ? updated : row)));
        setActionStatus('Saved.');
      },
      onError: (error) => {
        setActionStatus(error instanceof Error ? error.message : String(error));
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.portfolio.delete.mutationOptions({
      onSuccess: (_result, variables) => {
        updateListCache((items) => items.filter((row) => row.id !== variables.id));
        setActionStatus('Deleted.');
      },
      onError: (error) => {
        setActionStatus(error instanceof Error ? error.message : String(error));
      },
    }),
  );

  const runForPhoto = async (photoId: string, statusLabel: string, action: () => Promise<void>) => {
    setBusyIds((prev) => addBusyId(prev, photoId));
    setActionStatus(statusLabel);
    try {
      await action();
    } catch {
      /* mutation onError or action handler sets actionStatus */
    } finally {
      setBusyIds((prev) => removeBusyId(prev, photoId));
    }
  };

  const onPatch = async (
    photoId: string,
    body: PortfolioPhotoAdminUpdateBody,
    statusLabel: string,
  ) => {
    await runForPhoto(photoId, statusLabel, async () => {
      await updateMutation.mutateAsync({ id: photoId, data: body });
    });
  };

  const onDelete = async (photoId: string) => {
    await runForPhoto(photoId, 'Deleting…', async () => {
      await deleteMutation.mutateAsync({ id: photoId });
    });
  };

  const onReprocess = async (photoId: string) => {
    await runForPhoto(photoId, 'Reprocessing from original…', async () => {
      await requestReprocess({ id: photoId, bucket: 'portfolio' });
      setActionStatus('Reprocess complete.');
      await queryClient.invalidateQueries(trpc.portfolio.list.queryFilter());
    });
  };

  return (
    <>
      <p className="mt-4 text-xs" style={{ color: 'var(--color-fg-muted)' }} aria-live="polite">
        {statusMessage}
      </p>

<<<<<<< HEAD
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ color: 'var(--color-fg)' }}>
          <thead>
            <tr
              style={{
                color: 'var(--color-fg-muted)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <th className="py-2 pr-4 font-normal">Preview</th>
              <th className="py-2 pr-4 font-normal">Ingest</th>
              <th className="py-2 pr-4 font-normal">Size</th>
              <th className="py-2 pr-4 font-normal">Published</th>
              <th className="py-2 pr-4 font-normal">Alt</th>
              <th className="py-2 pr-4 font-normal">Title</th>
              <th className="py-2 pr-4 font-normal">Caption</th>
              <th className="py-2 pr-4 font-normal">Category</th>
              <th className="py-2 pr-4 font-normal">Sort</th>
              <th className="py-2 pr-4 font-normal">Hero</th>
              <th className="py-2 pr-4 font-normal">Updated</th>
              <th className="py-2 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {photos.map((photo) => (
              <PortfolioRow
                key={photo.id}
                photo={photo}
                busy={busyIds.has(photo.id)}
                onPatch={onPatch}
                onDelete={onDelete}
                onReprocess={onReprocess}
              />
            ))}
          </tbody>
        </table>
      </div>

      {listQuery.hasNextPage ? (
        <button
          type="button"
          className="mt-4 text-xs underline"
          style={{ color: 'var(--color-fg)' }}
          disabled={listQuery.isFetchingNextPage || busyIds.size > 0}
          onClick={() => {
            void listQuery.fetchNextPage();
          }}
        >
          {listQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
=======
      {showEmptyState ? (
        <AdminEmptyState title="No portfolio photos yet">
          <p>
            Upload originals on{' '}
            <a href="/admin/ingest" style={{ color: 'var(--color-accent)' }}>
              Upload
            </a>
            . When ingest status is <strong>ready</strong>, publish photos here for the public home
            grid and hero.
          </p>
        </AdminEmptyState>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ color: 'var(--color-fg)' }}>
            <thead>
              <tr
                style={{
                  color: 'var(--color-fg-muted)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <th className="py-2 pr-4 font-normal">Preview</th>
                <th className="py-2 pr-4 font-normal">Ingest</th>
                <th className="py-2 pr-4 font-normal">Size</th>
                <th className="py-2 pr-4 font-normal">Published</th>
                <th className="py-2 pr-4 font-normal">Alt</th>
                <th className="py-2 pr-4 font-normal">Title</th>
                <th className="py-2 pr-4 font-normal">Caption</th>
                <th className="py-2 pr-4 font-normal">Category</th>
                <th className="py-2 pr-4 font-normal">Sort</th>
                <th className="py-2 pr-4 font-normal">Hero</th>
                <th className="py-2 pr-4 font-normal">Updated</th>
                <th className="py-2 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {photos.map((photo) => (
                <PortfolioRow
                  key={photo.id}
                  photo={photo}
                  busy={busyIds.has(photo.id)}
                  onPatch={onPatch}
                  onDelete={onDelete}
                  onReprocess={onReprocess}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
>>>>>>> bc560e2 (feat(admin): empty states and ingest guidance (P2.5 P3 partial))
    </>
  );
}

export default function PortfolioAdminTable() {
  return (
    <AdminTrpcProvider>
      <PortfolioAdminTableInner />
    </AdminTrpcProvider>
  );
}
