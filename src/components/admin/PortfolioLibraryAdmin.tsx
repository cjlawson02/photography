import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { PortfolioPhotoAdminUpdateBody } from '../../lib/admin/portfolio-schemas.ts';
import type { AdminPortfolioListPage } from '../../lib/admin/trpc-types.ts';
import { canJoinFrontPage } from '../../lib/portfolio/front-page-eligibility.ts';
import { THUMB_VARIANT } from '../../lib/ingest/keys.ts';
import { portfolioVariantPublicUrl } from '../../lib/media/variant-media-url.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import PortfolioRow from './PortfolioRow.tsx';
import { errorMessage } from './admin-format.ts';
import { adminClass } from './admin-styles.ts';
import AdminEmptyState from './AdminEmptyState.tsx';
import AdminPhotoUpload from './AdminPhotoUpload.tsx';
import AdminPrimaryButton from './AdminPrimaryButton.tsx';
import AdminSectionHeading from './AdminSectionHeading.tsx';
import AdminStatusLine from './AdminStatusLine.tsx';
import { AdminTable, AdminTableHead, AdminTableHeaderCell } from './AdminTable.tsx';
import { requestReprocess } from '../../lib/ingest/browser-upload.ts';
import { addToSet, removeFromSet } from '../../lib/util/immutable-set.ts';

const portfolioListInfiniteQueryConfig = {
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage: AdminPortfolioListPage) => lastPage.nextCursor,
};

type PortfolioLibraryAdminInnerProps = {
  initialPortfolioPage?: AdminPortfolioListPage;
};

function PortfolioLibraryAdminInner({ initialPortfolioPage }: PortfolioLibraryAdminInnerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [initialDataUpdatedAt] = useState(() => Date.now());

  const listQuery = useInfiniteQuery({
    ...trpc.portfolio.list.infiniteQueryOptions(
      { stalePendingOnly: false },
      portfolioListInfiniteQueryConfig,
    ),
    ...(initialPortfolioPage !== undefined
      ? {
          initialData: { pages: [initialPortfolioPage], pageParams: [null] },
          initialDataUpdatedAt,
        }
      : {}),
  });

  const photos = listQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const selected = photos.find((photo) => photo.id === selectedId) ?? null;

  const updateMutation = useMutation(trpc.portfolio.update.mutationOptions());
  const membershipMutation = useMutation(trpc.portfolio.frontPage.setMembership.mutationOptions());
  const deleteMutation = useMutation(trpc.portfolio.delete.mutationOptions());

  const patchPhoto = async (
    photoId: string,
    body: PortfolioPhotoAdminUpdateBody,
    statusLabel: string,
  ) => {
    setActionStatus(statusLabel);
    try {
      await updateMutation.mutateAsync({ id: photoId, data: body });
      setActionStatus('Saved.');
      await queryClient.invalidateQueries(trpc.portfolio.list.queryFilter());
    } catch (error) {
      setActionStatus(errorMessage(error));
    }
  };

  return (
    <>
      <AdminSectionHeading>Library grid</AdminSectionHeading>
      <p className={`mt-2 text-sm ${adminClass.fgMuted}`}>
        Click a tile to inspect metadata below. Curate order on the{' '}
        <a className={adminClass.link} href="/admin/portfolio/front-page">
          front page
        </a>
        .
      </p>
      <div className="mt-4">
        <AdminPhotoUpload
          bucket="portfolio"
          onSuccess={async () => {
            setActionStatus('Upload complete.');
            await queryClient.invalidateQueries(trpc.portfolio.list.queryFilter());
          }}
        />
      </div>
      <AdminStatusLine className="mt-4">
        {actionStatus ??
          (listQuery.isPending ? 'Loading…' : `${photos.length} photo(s) in library.`)}
      </AdminStatusLine>
      {photos.length === 0 && listQuery.isSuccess ? (
        <div className="mt-6">
          <AdminEmptyState title="No portfolio photos yet">
            Upload above to start the library.
          </AdminEmptyState>
        </div>
      ) : (
        <>
          <ul className="admin-photo-grid mt-6">
            {photos.map((photo) => {
              const thumbUrl =
                photo.status === 'ready'
                  ? portfolioVariantPublicUrl(photo.id, THUMB_VARIANT.suffix, photo.updatedAt)
                  : null;
              return (
                <li key={photo.id}>
                  <button
                    type="button"
                    className={`admin-photo-grid__tile w-full text-left ${photo.id === selectedId ? 'admin-photo-grid__tile--selected' : ''}`}
                    onClick={() => setSelectedId(photo.id)}
                  >
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="" className="admin-photo-grid__img" />
                    ) : (
                      <span className={`p-4 text-xs ${adminClass.fgMuted}`}>{photo.status}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {selected ? (
            <div className="mt-8">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h3 className={`text-sm font-medium ${adminClass.fg}`}>Inspector</h3>
                {canJoinFrontPage(selected) && !selected.frontPage ? (
                  <AdminPrimaryButton
                    type="button"
                    disabled={membershipMutation.isPending}
                    onClick={() => {
                      void membershipMutation.mutateAsync({ id: selected.id, onFrontPage: true });
                    }}
                  >
                    Add to front page
                  </AdminPrimaryButton>
                ) : null}
              </div>
              <AdminTable>
                <AdminTableHead>
                  <AdminTableHeaderCell>Preview</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Ingest</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Size</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Published</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Category</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Alt</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Title</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Caption</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Sort</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Hero</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
                </AdminTableHead>
                <tbody>
                  <PortfolioRow
                    photo={selected}
                    busy={updateMutation.isPending || busyIds.has(selected.id)}
                    onPatch={patchPhoto}
                    onDelete={async (photoId) => {
                      if (!confirm(`Delete portfolio photo ${photoId}?`)) return;
                      await deleteMutation.mutateAsync({ id: photoId, cleanupR2: true });
                      setSelectedId(null);
                      await queryClient.invalidateQueries(trpc.portfolio.list.queryFilter());
                    }}
                    onReprocess={async (photoId) => {
                      setBusyIds((prev) => addToSet(prev, photoId));
                      try {
                        await requestReprocess({ id: photoId, bucket: 'portfolio' });
                        setActionStatus('Reprocess started.');
                      } catch (error) {
                        setActionStatus(errorMessage(error));
                      } finally {
                        setBusyIds((prev) => removeFromSet(prev, photoId));
                      }
                    }}
                  />
                </tbody>
              </AdminTable>
            </div>
          ) : null}
        </>
      )}
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
