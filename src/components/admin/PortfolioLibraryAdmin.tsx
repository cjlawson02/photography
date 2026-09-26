import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState, type MouseEvent } from 'react';

import type { PortfolioPhotoAdminUpdateBody } from '../../lib/admin/portfolio-schemas.ts';
import type { AdminPortfolioListPage, AdminPortfolioPhoto } from '../../lib/admin/trpc-types.ts';
import { requestReprocess } from '../../lib/ingest/browser-upload.ts';
import { THUMB_VARIANT } from '../../lib/ingest/keys.ts';
import { portfolioVariantPublicUrl } from '../../lib/media/variant-media-url.ts';
import { PORTFOLIO_CATEGORIES, isPortfolioCategory } from '../../lib/portfolio/categories.ts';
import { canJoinFrontPage } from '../../lib/portfolio/front-page-eligibility.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import { errorMessage } from './admin-format.ts';
import { adminClass } from './admin-styles.ts';
import AdminConfirmDialog from './AdminConfirmDialog.tsx';
import AdminEmptyState from './AdminEmptyState.tsx';
import AdminPhotoGridSkeleton from './AdminPhotoGridSkeleton.tsx';
import AdminPhotoUpload from './AdminPhotoUpload.tsx';
import AdminSectionHeading from './AdminSectionHeading.tsx';
import { useAdminToast } from './AdminToast.tsx';
import {
  EMPTY_GRID_SELECTION,
  pruneGridSelection,
  selectAllInGrid,
  selectInGrid,
  type GridSelection,
} from './grid-selection.ts';
import PortfolioInspector from './PortfolioInspector.tsx';
import PortfolioPhotoBadges from './PortfolioPhotoBadges.tsx';
import {
  LIBRARY_STATE_FILTERS,
  matchesLibraryFilters,
  type LibraryFilters,
  type LibraryStateFilter,
} from './portfolio-library-model.ts';
import { PORTFOLIO_LIST_INPUT, usePortfolioActions } from './usePortfolioActions.ts';

const portfolioListInfiniteQueryConfig = {
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage: AdminPortfolioListPage) => lastPage.nextCursor,
};

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

type PortfolioLibraryAdminInnerProps = {
  initialPortfolioPage?: AdminPortfolioListPage;
};

function PortfolioLibraryAdminInner({ initialPortfolioPage }: PortfolioLibraryAdminInnerProps) {
  const trpc = useTRPC();
  const { pushToast } = useAdminToast();
  const actions = usePortfolioActions();
  const [initialDataUpdatedAt] = useState(() => Date.now());
  const [filters, setFilters] = useState<LibraryFilters>({ state: 'all', category: 'all' });
  const [rawSelection, setSelection] = useState<GridSelection>(EMPTY_GRID_SELECTION);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminPortfolioPhoto[] | null>(null);

  const listQuery = useInfiniteQuery({
    ...trpc.portfolio.list.infiniteQueryOptions(
      PORTFOLIO_LIST_INPUT,
      portfolioListInfiniteQueryConfig,
    ),
    ...(initialPortfolioPage !== undefined
      ? {
          initialData: { pages: [initialPortfolioPage], pageParams: [null] },
          initialDataUpdatedAt,
        }
      : {}),
  });

  const photos = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data],
  );
  const visible = useMemo(
    () => photos.filter((photo) => matchesLibraryFilters(photo, filters)),
    [photos, filters],
  );
  const visibleIds = useMemo(() => visible.map((photo) => photo.id), [visible]);
  const selection = pruneGridSelection(rawSelection, visibleIds);
  const selected = visible.filter((photo) => selection.ids.has(photo.id));

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      pushToast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const retry = (id: string) =>
    void run(async () => {
      await requestReprocess({ id, bucket: 'portfolio' });
      pushToast('Retry started.');
      await actions.invalidateLibrary();
    });

  const onTileClick = (event: MouseEvent<HTMLButtonElement>, id: string) => {
    setSelection((current) =>
      selectInGrid(pruneGridSelection(current, visibleIds), visibleIds, id, {
        shift: event.shiftKey,
        toggle: event.metaKey || event.ctrlKey,
      }),
    );
  };

  const saveSelection = async (
    targets: AdminPortfolioPhoto[],
    data: PortfolioPhotoAdminUpdateBody,
  ) => {
    if (data.published === false) {
      await actions.updatePhotos(targets, data, {
        toast: `Unpublished ${plural(targets.length, 'photo')}.`,
        undo: true,
      });
      return;
    }
    await actions.updatePhotos(targets, data);
  };

  const readyUnpublished = selected.filter((photo) => photo.status === 'ready' && !photo.published);
  const published = selected.filter((photo) => photo.published);
  const eligibleForFrontPage = selected.filter(
    (photo) => !photo.frontPage && canJoinFrontPage(photo),
  );
  const blockedFromFrontPage = selected.filter(
    (photo) => !photo.frontPage && !canJoinFrontPage(photo),
  ).length;
  const needsDetailsCount = photos.filter((photo) =>
    matchesLibraryFilters(photo, { state: 'needsDetails', category: 'all' }),
  ).length;

  return (
    <>
      <AdminSectionHeading>Library</AdminSectionHeading>
      <p className={`mt-2 text-sm ${adminClass.fgMuted}`}>
        Click a photo to edit it on the right. Shift-click selects a range; ⌘/Ctrl-click adds or
        removes one. Photos need alt text and a category (“Needs details”) and must be published
        before they can join the{' '}
        <a className={adminClass.link} href="/admin/portfolio/front-page">
          front page
        </a>
        .
      </p>
      <div className="mt-4">
        <AdminPhotoUpload
          bucket="portfolio"
          onSuccess={async () => {
            pushToast('Upload complete — new photos appear as they finish processing.');
            await actions.invalidateLibrary();
          }}
        />
      </div>

      <div className={adminClass.toolbar}>
        <label className="inline-flex items-center gap-2">
          Category
          <select
            className={`${adminClass.fieldSm} admin-field--inline`}
            value={filters.category}
            onChange={(event) => {
              const value = event.target.value;
              setFilters((current) => ({
                ...current,
                category: value === 'uncategorized' || isPortfolioCategory(value) ? value : 'all',
              }));
            }}
          >
            <option value="all">All categories</option>
            <option value="uncategorized">Uncategorized</option>
            {PORTFOLIO_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2">
          State
          <select
            className={`${adminClass.fieldSm} admin-field--inline`}
            value={filters.state}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                state: event.target.value as LibraryStateFilter,
              }))
            }
          >
            {LIBRARY_STATE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === 'needsDetails'
                  ? `${option.label} (${needsDetailsCount})`
                  : option.label}
              </option>
            ))}
          </select>
        </label>
        <span>
          {listQuery.isPending
            ? 'Loading…'
            : visible.length === photos.length
              ? `${plural(photos.length, 'photo')}`
              : `${visible.length} of ${photos.length} loaded photos`}
        </span>
        {visible.length > 0 ? (
          <button
            type="button"
            className={adminClass.linkMuted}
            onClick={() => setSelection(selectAllInGrid(visibleIds))}
          >
            Select all shown
          </button>
        ) : null}
        <a className={adminClass.link} href="/" target="_blank" rel="noreferrer">
          View on site
        </a>
      </div>
      {listQuery.isError ? (
        <p role="alert" className={`mt-3 text-sm ${adminClass.accent}`}>
          Couldn’t load the library: {errorMessage(listQuery.error)}
        </p>
      ) : null}

      <div className="admin-library mt-4">
        <div className="min-w-0">
          {selected.length > 0 ? (
            <div className="admin-action-bar" role="toolbar" aria-label="Selection actions">
              <strong className={adminClass.fg}>{selected.length} selected</strong>
              <button
                type="button"
                className={adminClass.linkMuted}
                disabled={busy || readyUnpublished.length === 0}
                onClick={() =>
                  void run(() =>
                    actions.updatePhotos(
                      readyUnpublished,
                      { published: true },
                      {
                        toast: `Published ${plural(readyUnpublished.length, 'photo')}.`,
                        undo: true,
                      },
                    ),
                  )
                }
              >
                Publish
              </button>
              <button
                type="button"
                className={adminClass.linkMuted}
                disabled={busy || published.length === 0}
                onClick={() => void run(() => saveSelection(published, { published: false }))}
              >
                Unpublish
              </button>
              <label className="inline-flex items-center gap-1">
                <span className="sr-only">Set tags for selection</span>
                <select
                  className={`${adminClass.fieldSm} admin-field--inline`}
                  value=""
                  disabled={busy}
                  onChange={(event) => {
                    const value = event.target.value;
                    const tags = isPortfolioCategory(value) ? [value] : [];
                    void run(() =>
                      actions.updatePhotos(
                        selected,
                        { tags },
                        {
                          toast: `Set tags to ${tags[0] ?? 'none'} on ${plural(selected.length, 'photo')}.`,
                          undo: true,
                        },
                      ),
                    );
                  }}
                >
                  <option value="" disabled>
                    Set tags…
                  </option>
                  <option value="none">— None —</option>
                  {PORTFOLIO_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={adminClass.linkMuted}
                disabled={busy || eligibleForFrontPage.length === 0}
                title={
                  eligibleForFrontPage.length === 0
                    ? 'Selected photos need alt text, a category, and to be published'
                    : undefined
                }
                onClick={() => void run(() => actions.addToFrontPage(eligibleForFrontPage))}
              >
                Add to front page
                {eligibleForFrontPage.length !== selected.length
                  ? ` (${eligibleForFrontPage.length})`
                  : ''}
              </button>
              <button
                type="button"
                className={`${adminClass.linkMuted} ${adminClass.accent}`}
                disabled={busy}
                onClick={() => setConfirmDelete(selected)}
              >
                Delete…
              </button>
              <button
                type="button"
                className={`ml-auto ${adminClass.linkMuted}`}
                onClick={() => setSelection(EMPTY_GRID_SELECTION)}
              >
                Clear selection
              </button>
              {blockedFromFrontPage > 0 ? (
                <span className="basis-full text-xs">
                  {plural(blockedFromFrontPage, 'selected photo')} can’t join the front page yet
                  (needs details, unpublished, or still processing).
                </span>
              ) : null}
            </div>
          ) : null}

          {listQuery.isPending ? (
            <AdminPhotoGridSkeleton />
          ) : photos.length === 0 && listQuery.isSuccess ? (
            <AdminEmptyState title="No portfolio photos yet">
              Upload above to start the library. New photos show up here while they process.
            </AdminEmptyState>
          ) : visible.length === 0 && listQuery.isSuccess ? (
            <AdminEmptyState title="No photos match these filters">
              Change the category or state filter
              {listQuery.hasNextPage ? ', or load more photos below' : ''}.
            </AdminEmptyState>
          ) : (
            <ul
              className="admin-photo-grid admin-photo-grid--selectable"
              aria-label="Library photos"
            >
              {visible.map((photo) => {
                const thumbUrl =
                  photo.status === 'ready'
                    ? portfolioVariantPublicUrl(photo.id, THUMB_VARIANT.suffix, photo.updatedAt)
                    : null;
                const isSelected = selection.ids.has(photo.id);
                return (
                  <li key={photo.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={photo.title?.trim() || photo.alt?.trim() || 'Untitled photo'}
                      className={`admin-photo-grid__tile w-full text-left ${isSelected ? 'admin-photo-grid__tile--selected' : ''}`}
                      onClick={(event) => onTileClick(event, photo.id)}
                    >
                      {thumbUrl ? (
                        <img src={thumbUrl} alt="" className="admin-photo-grid__img" />
                      ) : (
                        <span className="admin-photo-grid__img admin-photo-grid__placeholder" />
                      )}
                      <PortfolioPhotoBadges photo={photo} />
                    </button>
                    {photo.status !== 'ready' ? (
                      <div className="mt-1 flex gap-3 text-xs">
                        <button
                          type="button"
                          className={adminClass.linkMuted}
                          disabled={busy}
                          onClick={() => retry(photo.id)}
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          className={`${adminClass.linkMuted} ${adminClass.accent}`}
                          disabled={busy}
                          onClick={() => setConfirmDelete([photo])}
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {listQuery.hasNextPage ? (
            <div className="mt-4">
              <button
                type="button"
                className={adminClass.linkMuted}
                disabled={listQuery.isFetchingNextPage}
                onClick={() => void listQuery.fetchNextPage()}
              >
                {listQuery.isFetchingNextPage ? 'Loading…' : 'Load more photos'}
              </button>
            </div>
          ) : null}
        </div>

        <aside className={`admin-library__inspector ${adminClass.panel}`}>
          {selected.length > 0 ? (
            <PortfolioInspector
              key={selected.map((photo) => photo.id).join(',')}
              photos={selected}
              busy={busy}
              onSave={(data) => saveSelection(selected, data)}
              onAddToFrontPage={(targets) => void run(() => actions.addToFrontPage(targets))}
              onRemoveFromFrontPage={(targets) =>
                void run(() => actions.removeFromFrontPage(targets))
              }
              onRetry={retry}
              onDelete={() => setConfirmDelete(selected)}
            />
          ) : (
            <p className={`text-sm ${adminClass.fgMuted}`}>
              Select a photo to edit its details. Select several to edit them together.
            </p>
          )}
        </aside>
      </div>

      <AdminConfirmDialog
        open={confirmDelete !== null}
        title={
          confirmDelete?.length === 1
            ? 'Delete this photo?'
            : `Delete ${confirmDelete?.length ?? 0} photos?`
        }
        confirmLabel="Delete permanently"
        pending={busy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          const targets = confirmDelete ?? [];
          void run(async () => {
            await actions.deletePhotos(targets.map((photo) => photo.id));
            setConfirmDelete(null);
            setSelection(EMPTY_GRID_SELECTION);
          });
        }}
      >
        <p>
          {confirmDelete?.length === 1
            ? 'The photo and its files are'
            : 'These photos and their files are'}{' '}
          removed from storage. They disappear from the public site
          {confirmDelete?.some((photo) => photo.frontPage) ? ' and the front page' : ''}, and any
          links to them stop working.
        </p>
        <p className="mt-2">This can’t be undone. To hide a photo instead, unpublish it.</p>
      </AdminConfirmDialog>
    </>
  );
}

export default function PortfolioLibraryAdmin(props: PortfolioLibraryAdminInnerProps) {
  return (
    <AdminTrpcProvider>
      <PortfolioLibraryAdminInner {...props} />
    </AdminTrpcProvider>
  );
}
