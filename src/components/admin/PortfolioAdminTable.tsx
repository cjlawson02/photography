import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { PortfolioPhotoAdminUpdateBody } from '../../lib/admin/portfolio-schemas.ts';
import type { AdminPortfolioListPage } from '../../lib/admin/trpc-types.ts';
import { requestReprocess } from '../../lib/ingest/browser-upload.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import { errorMessage } from './admin-format.ts';
import { adminBorderStyle, adminFgMutedStyle, adminFgStyle } from './admin-styles.ts';
import AdminEmptyState from './AdminEmptyState.tsx';
import AdminPhotoUpload from './AdminPhotoUpload.tsx';
import AdminStatusLine from './AdminStatusLine.tsx';
import { AdminTable, AdminTableHead, AdminTableHeaderCell } from './AdminTable.tsx';
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
  const [stalePendingOnly, setStalePendingOnly] = useState(false);

  const listInfiniteQueryOptions = trpc.portfolio.list.infiniteQueryOptions(
    { stalePendingOnly },
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

  const cleanupStaleMutation = useMutation(
    trpc.ingest.cleanupStalePending.mutationOptions({
      onSuccess: (result) => {
        const total = result.portfolioRemoved.length + result.reviewRemoved.length;
        setActionStatus(
          total === 0
            ? 'No stale pending ingest rows to remove.'
            : `Removed ${total} stale pending row(s) (portfolio ${result.portfolioRemoved.length}, review ${result.reviewRemoved.length}).`,
        );
        void queryClient.invalidateQueries(trpc.portfolio.list.queryFilter());
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
      <section
        className="mt-4 rounded border p-4"
        style={adminBorderStyle}
        aria-label="Upload portfolio photo"
      >
        <AdminPhotoUpload
          bucket="portfolio"
          compact
          onSuccess={async () => {
            setActionStatus('Upload complete — refresh list if the new row is not visible yet.');
            await queryClient.invalidateQueries(trpc.portfolio.list.queryFilter());
          }}
        />
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs" style={adminFgMutedStyle}>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={stalePendingOnly}
            onChange={(event) => {
              setStalePendingOnly(event.target.checked);
            }}
          />
          Stale pending only
        </label>
        <button
          type="button"
          className="underline"
          style={adminFgStyle}
          disabled={cleanupStaleMutation.isPending || busyIds.size > 0}
          onClick={() => {
            if (
              !confirm(
                'Remove all stale pending ingest rows (portfolio + review) and best-effort R2 keys?',
              )
            ) {
              return;
            }
            cleanupStaleMutation.mutate();
          }}
        >
          {cleanupStaleMutation.isPending ? 'Cleaning…' : 'Clean up stale pending'}
        </button>
      </div>

      <AdminStatusLine className="mt-2">{statusMessage}</AdminStatusLine>

      {showEmptyState ? (
        <AdminEmptyState title="No portfolio photos yet">
          <p>
            Use the upload form above to add originals. When ingest status is <strong>ready</strong>
            , publish photos here for the public home grid and hero.
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
              style={adminFgStyle}
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
