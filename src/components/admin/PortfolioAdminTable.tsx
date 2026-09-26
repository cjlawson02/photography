import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { PortfolioPhotoAdminUpdateBody } from '../../lib/admin/portfolio-schemas.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import { requestReprocess } from '../../lib/ingest/browser-upload.ts';
import PortfolioRow from './PortfolioRow.tsx';

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

  const listQuery = useQuery(trpc.portfolio.list.queryOptions());

  const photos = listQuery.data ?? [];

  const listStatus = listQuery.isPending
    ? 'Loading…'
    : listQuery.isError
      ? listQuery.error instanceof Error
        ? listQuery.error.message
        : String(listQuery.error)
      : photos.length === 0
        ? 'No portfolio photos yet — upload via Upload.'
        : `${photos.length} photo(s).`;

  const statusMessage = actionStatus !== null ? actionStatus : listStatus;

  const updateMutation = useMutation(
    trpc.portfolio.update.mutationOptions({
      onSuccess: (updated) => {
        queryClient.setQueryData(trpc.portfolio.list.queryKey(), (current) =>
          current?.map((row) => (row.id === updated.id ? updated : row)),
        );
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
        queryClient.setQueryData(trpc.portfolio.list.queryKey(), (current) =>
          current?.filter((row) => row.id !== variables.id),
        );
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
