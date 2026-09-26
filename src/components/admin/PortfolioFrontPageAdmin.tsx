import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type DragEvent } from 'react';

import type { AdminFrontPageList } from '../../lib/admin/trpc-types.ts';
import { THUMB_VARIANT } from '../../lib/ingest/keys.ts';
import { portfolioVariantPublicUrl } from '../../lib/media/variant-media-url.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import { errorMessage } from './admin-format.ts';
import { adminClass } from './admin-styles.ts';
import AdminEmptyState from './AdminEmptyState.tsx';
import AdminPhotoGridSkeleton from './AdminPhotoGridSkeleton.tsx';
import AdminSectionHeading from './AdminSectionHeading.tsx';
import { useAdminToast } from './AdminToast.tsx';
import { moveIdOnto, moveItem } from './front-page-order.ts';
import { usePortfolioActions } from './usePortfolioActions.ts';

type PortfolioFrontPageAdminInnerProps = {
  initialFrontPage?: AdminFrontPageList;
};

function PortfolioFrontPageAdminInner({ initialFrontPage }: PortfolioFrontPageAdminInnerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { pushToast } = useAdminToast();
  const actions = usePortfolioActions();
  const [initialDataUpdatedAt] = useState(() => Date.now());
  const listKey = trpc.portfolio.frontPage.list.queryKey();
  const listQuery = useQuery({
    ...trpc.portfolio.frontPage.list.queryOptions(),
    ...(initialFrontPage !== undefined
      ? { initialData: initialFrontPage, initialDataUpdatedAt }
      : {}),
  });
  const reorderMutation = useMutation(trpc.portfolio.frontPage.reorder.mutationOptions());
  const updateMutation = useMutation(trpc.portfolio.update.mutationOptions());
  const [orderSaved, setOrderSaved] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set());

  const items = listQuery.data?.items ?? [];
  const ids = items.map((photo) => photo.id);
  const saving = reorderMutation.isPending;

  const persistOrder = async (orderedIds: string[]) => {
    const before = queryClient.getQueryData(listKey);
    const byId = new Map(items.map((photo) => [photo.id, photo]));
    queryClient.setQueryData(
      listKey,
      (data) => data && { ...data, items: orderedIds.map((id) => byId.get(id)!) },
    );
    setOrderSaved(false);
    try {
      await reorderMutation.mutateAsync({ orderedIds });
      setOrderSaved(true);
    } catch (error) {
      queryClient.setQueryData(listKey, before);
      pushToast(`Couldn’t save the new order: ${errorMessage(error)}`);
    }
  };

  const withBusy = async (id: string, task: () => Promise<void>) => {
    setBusyIds((current) => new Set(current).add(id));
    try {
      await task();
    } catch (error) {
      pushToast(errorMessage(error));
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const setHero = (id: string, hero: boolean) =>
    withBusy(id, async () => {
      const before = queryClient.getQueryData(listKey);
      queryClient.setQueryData(
        listKey,
        (data) =>
          data && {
            ...data,
            items: data.items.map((photo) => (photo.id === id ? { ...photo, hero } : photo)),
          },
      );
      try {
        const row = await updateMutation.mutateAsync({ id, data: { hero } });
        actions.mergeLibraryRows([row]);
      } catch (error) {
        queryClient.setQueryData(listKey, before);
        throw error;
      }
    });

  const endDrag = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  const dragHandlers = (id: string) => ({
    draggable: !saving,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
      setDraggingId(id);
    },
    onDragOver: (event: DragEvent) => {
      if (!draggingId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (dropTargetId !== id) setDropTargetId(id);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      if (draggingId && draggingId !== id) void persistOrder(moveIdOnto(ids, draggingId, id));
      endDrag();
    },
    onDragEnd: endDrag,
  });

  const heroCount = items.filter((photo) => photo.hero).length;

  return (
    <>
      <AdminSectionHeading>Front-page set</AdminSectionHeading>
      <p className={`mt-2 text-sm ${adminClass.fgMuted}`}>
        Drag photos to reorder, or use the arrow buttons. This order is the default Featured view on
        the home page. Tick <strong>Hero</strong> on any number of photos to make them carousel
        slides. Add photos from the{' '}
        <a className={adminClass.link} href="/admin/portfolio/library">
          Library
        </a>
        ; removing a photo here keeps it in the library.
      </p>
      <div className={adminClass.toolbar}>
        <span>
          {listQuery.isPending
            ? 'Loading…'
            : `${items.length} ${items.length === 1 ? 'photo' : 'photos'} · ${heroCount} hero`}
        </span>
        <span aria-live="polite">{saving ? 'Saving order…' : orderSaved ? 'Order saved' : ''}</span>
        <a className={adminClass.link} href="/" target="_blank" rel="noreferrer">
          View on site
        </a>
      </div>
      {listQuery.isError ? (
        <p role="alert" className={`mt-3 text-sm ${adminClass.accent}`}>
          Couldn’t load the front page: {errorMessage(listQuery.error)}
        </p>
      ) : null}
      {listQuery.isPending ? (
        <div className="mt-6">
          <AdminPhotoGridSkeleton />
        </div>
      ) : items.length === 0 && listQuery.isSuccess ? (
        <div className="mt-6">
          <AdminEmptyState title="The front page is empty">
            In the Library, select photos with details filled in, publish them, then choose “Add to
            front page”.
          </AdminEmptyState>
        </div>
      ) : (
        <ol className="admin-photo-grid mt-6" aria-label="Front-page order">
          {items.map((photo, index) => {
            const label = photo.title?.trim() || photo.alt?.trim() || `Photo ${index + 1}`;
            const busy = busyIds.has(photo.id);
            return (
              <li
                key={photo.id}
                {...dragHandlers(photo.id)}
                className={[
                  'admin-photo-grid__tile admin-photo-grid__tile--draggable',
                  draggingId === photo.id ? 'admin-photo-grid__tile--dragging' : '',
                  dropTargetId === photo.id && draggingId !== photo.id
                    ? 'admin-photo-grid__tile--drop-target'
                    : '',
                ].join(' ')}
              >
                <img
                  src={portfolioVariantPublicUrl(photo.id, THUMB_VARIANT.suffix, photo.updatedAt)}
                  alt=""
                  draggable={false}
                  className="admin-photo-grid__img"
                />
                <div className="admin-photo-grid__meta">
                  <span className="text-xs">
                    <span className={adminClass.fgMuted}>{index + 1}.</span> {label}
                  </span>
                  <label className={`mt-2 flex items-center gap-2 text-xs ${adminClass.fgMuted}`}>
                    <input
                      type="checkbox"
                      checked={photo.hero}
                      disabled={busy}
                      onChange={(event) => void setHero(photo.id, event.target.checked)}
                    />
                    Hero
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={adminClass.linkMuted}
                      aria-label={`Move ${label} earlier`}
                      disabled={index === 0 || saving}
                      onClick={() => void persistOrder(moveItem(ids, index, index - 1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={adminClass.linkMuted}
                      aria-label={`Move ${label} later`}
                      disabled={index === items.length - 1 || saving}
                      onClick={() => void persistOrder(moveItem(ids, index, index + 1))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={`text-xs ${adminClass.linkMuted}`}
                      disabled={busy}
                      onClick={() =>
                        void withBusy(photo.id, () => actions.removeFromFrontPage([photo]))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

export default function PortfolioFrontPageAdmin(props: PortfolioFrontPageAdminInnerProps) {
  return (
    <AdminTrpcProvider>
      <PortfolioFrontPageAdminInner {...props} />
    </AdminTrpcProvider>
  );
}
