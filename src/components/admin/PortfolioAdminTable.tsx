import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { PortfolioPhotoAdminUpdateBody } from '../../lib/admin/portfolio-schemas.ts';
import type { AdminPortfolioListPage } from '../../lib/admin/trpc-types.ts';
import { requestReprocess } from '../../lib/ingest/browser-upload.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import { errorMessage } from './admin-format.ts';
import AdminEmptyState from './AdminEmptyState.tsx';
import AdminStatusLine from './AdminStatusLine.tsx';
import { AdminTable, AdminTableHead, AdminTableHeaderCell } from './AdminTable.tsx';
import { adminAccentStyle } from './admin-styles.ts';
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
      ? errorMessage(listQuery.error)
      : photos.length === 0
        ? 'No portfolio photos yet.'
        : `${photos.length} photo(s) shown${listQuery.hasNextPage ? ' — load more for older photos.' : '.'}`;

  const statusMessage = actionStatus !== null ? actionStatus : listStatus;

  const showEmptyState =
    listQuery.isSuccess && !listQuery.isError && photos.length === 0 && actionStatus === null;

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

  const updateMutation = useMutation(
    trpc.portfolio.update.mutationOptions({
      onSuccess: (updated) => {
        updateListCache((items) => items.map((row) => (row.id === updated.id ? updated : row)));
        setActionStatus('Saved.');
      },
      onError: (error) => {
        setActionStatus(errorMessage(error));
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
        setActionStatus(errorMessage(error));
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
      <AdminStatusLine>{statusMessage}</AdminStatusLine>

      {showEmptyState ? (
        <AdminEmptyState title="No portfolio photos yet">
          <p>
            Upload originals on{' '}
            <a href="/admin/ingest" style={adminAccentStyle}>
              Upload
            </a>
            . When ingest status is <strong>ready</strong>, publish photos here for the public home
            grid and hero.
          </p>
        </AdminEmptyState>
      ) : (
        <>
          <AdminTable>
            <AdminTableHead>
              <AdminTableHeaderCell>Preview</AdminTableHeaderCell>
              <AdminTableHeaderCell>Ingest</AdminTableHeaderCell>
              <AdminTableHeaderCell>Size</AdminTableHeaderCell>
              <AdminTableHeaderCell>Published</AdminTableHeaderCell>
              <AdminTableHeaderCell>Alt</AdminTableHeaderCell>
              <AdminTableHeaderCell>Title</AdminTableHeaderCell>
              <AdminTableHeaderCell>Caption</AdminTableHeaderCell>
              <AdminTableHeaderCell>Category</AdminTableHeaderCell>
              <AdminTableHeaderCell>Sort</AdminTableHeaderCell>
              <AdminTableHeaderCell>Hero</AdminTableHeaderCell>
              <AdminTableHeaderCell>Updated</AdminTableHeaderCell>
              <AdminTableHeaderCell className="py-2">Actions</AdminTableHeaderCell>
            </AdminTableHead>
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
          </AdminTable>

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
        </>
      )}
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
