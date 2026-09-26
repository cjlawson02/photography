import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import {
  PORTFOLIO_BULK_MAX_IDS,
  type PortfolioPhotoAdminUpdateBody,
} from '../../lib/admin/portfolio-schemas.ts';
import type { AdminPortfolioListPage, AdminPortfolioPhoto } from '../../lib/admin/trpc-types.ts';
import { useTRPC } from '../../lib/trpc/react.tsx';
import { errorMessage } from './admin-format.ts';
import { useAdminToast } from './AdminToast.tsx';
import { reinsertIds } from './front-page-order.ts';
import { chunk, restorePatches } from './portfolio-library-model.ts';

export const PORTFOLIO_LIST_INPUT = { stalePendingOnly: false } as const;

type FrontPageEntry = { id: string; index: number; hero: boolean };

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Portfolio mutations shared by Library and Front page: optimistic cache writes, undo toasts,
 * and front-page membership via atomic `frontPage.set` / `frontPage.add`.
 */
export function usePortfolioActions() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { pushToast } = useAdminToast();

  const listKey = trpc.portfolio.list.infiniteQueryKey(PORTFOLIO_LIST_INPUT);
  const frontPageKey = trpc.portfolio.frontPage.list.queryKey();

  const updateMutation = useMutation(trpc.portfolio.update.mutationOptions());
  const bulkUpdateMutation = useMutation(trpc.portfolio.bulkUpdate.mutationOptions());
  const bulkDeleteMutation = useMutation(trpc.portfolio.bulkDelete.mutationOptions());
  const frontPageSetMutation = useMutation(trpc.portfolio.frontPage.set.mutationOptions());
  const frontPageAddMutation = useMutation(trpc.portfolio.frontPage.add.mutationOptions());

  const mapLibraryRows = (fn: (photo: AdminPortfolioPhoto) => AdminPortfolioPhoto | null) => {
    queryClient.setQueryData<InfiniteData<AdminPortfolioListPage, string | null>>(
      listKey,
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.flatMap((photo) => {
              const next = fn(photo);
              return next ? [next] : [];
            }),
          })),
        },
    );
  };

  const mergeLibraryRows = (rows: readonly AdminPortfolioPhoto[]) => {
    const byId = new Map(rows.map((row) => [row.id, row]));
    mapLibraryRows((photo) => byId.get(photo.id) ?? photo);
  };

  const patchLibraryRows = (ids: ReadonlySet<string>, patch: Partial<AdminPortfolioPhoto>) => {
    mapLibraryRows((photo) => (ids.has(photo.id) ? { ...photo, ...patch } : photo));
  };

  const writeMetadata = async (ids: readonly string[], data: PortfolioPhotoAdminUpdateBody) => {
    if (ids.length === 1) {
      return [await updateMutation.mutateAsync({ id: ids[0]!, data })];
    }
    const rows: AdminPortfolioPhoto[] = [];
    for (const group of chunk(ids, PORTFOLIO_BULK_MAX_IDS)) {
      rows.push(...(await bulkUpdateMutation.mutateAsync({ ids: group, data })).items);
    }
    return rows;
  };

  const fetchFrontPageIds = async () => {
    const data = await queryClient.query({
      ...trpc.portfolio.frontPage.list.queryOptions(),
      staleTime: 0,
    });
    return data.items.map((item) => item.id);
  };

  const restoreFrontPage = async (entries: readonly FrontPageEntry[]) => {
    const orderedIds = reinsertIds(await fetchFrontPageIds(), entries);
    await frontPageSetMutation.mutateAsync({
      orderedIds,
      heroIds: entries.filter((entry) => entry.hero).map((entry) => entry.id),
    });
    for (const entry of entries) {
      patchLibraryRows(new Set([entry.id]), {
        frontPage: true,
        frontPageOrder: orderedIds.indexOf(entry.id),
        ...(entry.hero ? { hero: true } : {}),
      });
    }
    await queryClient.invalidateQueries({ queryKey: frontPageKey });
  };

  const undoable = (run: () => Promise<void>, doneMessage: string) => () => {
    void run()
      .then(() => pushToast(doneMessage))
      .catch((error: unknown) => pushToast(`Undo failed: ${errorMessage(error)}`));
  };

  /**
   * Optimistic metadata write for one photo or a selection. Rolls back and rethrows on error.
   * `toast` + `undo` add an undo toast restoring each photo's previous values.
   */
  const updatePhotos = async (
    photos: readonly AdminPortfolioPhoto[],
    data: PortfolioPhotoAdminUpdateBody,
    options: { toast?: string; undo?: boolean } = {},
  ) => {
    const ids = photos.map((photo) => photo.id);
    const before = queryClient.getQueryData(listKey);
    const leavesFrontPage = data.published === false;
    patchLibraryRows(new Set(ids), {
      ...data,
      ...(leavesFrontPage ? { frontPage: false, frontPageOrder: null } : {}),
    });
    try {
      mergeLibraryRows(await writeMetadata(ids, data));
    } catch (error) {
      queryClient.setQueryData(listKey, before);
      throw error;
    }
    const frontPageLeavers = leavesFrontPage ? photos.filter((photo) => photo.frontPage) : [];
    if (frontPageLeavers.length > 0 || 'hero' in data) {
      await queryClient.invalidateQueries({ queryKey: frontPageKey });
    }
    if (!options.toast) return;
    pushToast(
      options.toast,
      options.undo
        ? {
            undo: undoable(async () => {
              const rows: AdminPortfolioPhoto[] = [];
              for (const patch of restorePatches(
                photos,
                Object.keys(data) as (keyof PortfolioPhotoAdminUpdateBody)[],
              )) {
                rows.push(...(await writeMetadata(patch.ids, patch.data)));
              }
              mergeLibraryRows(rows);
              if (frontPageLeavers.length > 0) {
                await restoreFrontPage(
                  frontPageLeavers.map((photo) => ({
                    id: photo.id,
                    index: photo.frontPageOrder ?? Number.MAX_SAFE_INTEGER,
                    hero: false,
                  })),
                );
              }
            }, 'Change undone.'),
          }
        : undefined,
    );
  };

  /** Remove from the set in one atomic write (hero cleared) with an undo toast. */
  const removeFromFrontPage = async (
    photos: readonly Pick<AdminPortfolioPhoto, 'id' | 'hero'>[],
  ) => {
    const currentIds = await fetchFrontPageIds();
    const removing = new Set(photos.map((photo) => photo.id));
    const entries = photos
      .map((photo) => ({ id: photo.id, index: currentIds.indexOf(photo.id), hero: photo.hero }))
      .filter((entry) => entry.index !== -1);
    const before = queryClient.getQueryData(frontPageKey);
    queryClient.setQueryData(
      frontPageKey,
      (data) => data && { ...data, items: data.items.filter((item) => !removing.has(item.id)) },
    );
    try {
      await frontPageSetMutation.mutateAsync({
        orderedIds: currentIds.filter((id) => !removing.has(id)),
      });
    } catch (error) {
      queryClient.setQueryData(frontPageKey, before);
      throw error;
    }
    patchLibraryRows(removing, { frontPage: false, frontPageOrder: null, hero: false });
    await queryClient.invalidateQueries({ queryKey: frontPageKey });
    pushToast(`Removed ${plural(entries.length, 'photo')} from the front page.`, {
      undo: undoable(() => restoreFrontPage(entries), 'Restored to the front page.'),
    });
  };

  /** Append eligible photos (server re-checks eligibility) with an undo toast. */
  const addToFrontPage = async (photos: readonly AdminPortfolioPhoto[]) => {
    const added: string[] = [];
    const skipped: { id: string; reason: string }[] = [];
    for (const group of chunk(
      photos.map((photo) => photo.id),
      PORTFOLIO_BULK_MAX_IDS,
    )) {
      const result = await frontPageAddMutation.mutateAsync({ ids: group });
      added.push(...result.added);
      skipped.push(...result.skipped);
    }
    patchLibraryRows(new Set(added), { frontPage: true });
    await queryClient.invalidateQueries({ queryKey: frontPageKey });
    const skippedNote =
      skipped.length > 0
        ? ` ${plural(skipped.length, 'photo')} skipped: ${skipped[0]!.reason}`
        : '';
    if (added.length === 0) {
      pushToast(`Nothing added to the front page.${skippedNote}`);
      return;
    }
    pushToast(`Added ${plural(added.length, 'photo')} to the front page.${skippedNote}`, {
      undo: undoable(async () => {
        const removing = new Set(added);
        const currentIds = await fetchFrontPageIds();
        await frontPageSetMutation.mutateAsync({
          orderedIds: currentIds.filter((id) => !removing.has(id)),
        });
        patchLibraryRows(removing, { frontPage: false, frontPageOrder: null, hero: false });
        await queryClient.invalidateQueries({ queryKey: frontPageKey });
      }, 'Change undone.'),
    });
  };

  const deletePhotos = async (ids: readonly string[]) => {
    const deleted = new Set<string>();
    try {
      for (const group of chunk(ids, PORTFOLIO_BULK_MAX_IDS)) {
        const result = await bulkDeleteMutation.mutateAsync({ ids: group, cleanupR2: true });
        for (const id of result.ids) deleted.add(id);
      }
    } finally {
      mapLibraryRows((photo) => (deleted.has(photo.id) ? null : photo));
      await queryClient.invalidateQueries({ queryKey: frontPageKey });
    }
    pushToast(`Deleted ${plural(deleted.size, 'photo')}.`);
  };

  return {
    updatePhotos,
    removeFromFrontPage,
    addToFrontPage,
    deletePhotos,
    mergeLibraryRows,
    invalidateLibrary: () => queryClient.invalidateQueries({ queryKey: listKey }),
  };
}
