import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { THUMB_VARIANT } from '../../lib/ingest/keys.ts';
import { portfolioVariantPublicUrl } from '../../lib/media/variant-media-url.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import { errorMessage } from './admin-format.ts';
import { adminClass } from './admin-styles.ts';
import AdminPrimaryButton from './AdminPrimaryButton.tsx';
import AdminSectionHeading from './AdminSectionHeading.tsx';
import AdminStatusLine from './AdminStatusLine.tsx';

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed!);
  return next;
}

function PortfolioFrontPageAdminInner() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.portfolio.frontPage.list.queryOptions());
  const [status, setStatus] = useState<string | null>(null);

  const reorderMutation = useMutation(
    trpc.portfolio.frontPage.reorder.mutationOptions({
      onSuccess: async () => {
        setStatus('Order saved.');
        await queryClient.invalidateQueries(trpc.portfolio.frontPage.list.queryFilter());
      },
      onError: (error) => setStatus(errorMessage(error)),
    }),
  );

  const membershipMutation = useMutation(
    trpc.portfolio.frontPage.setMembership.mutationOptions({
      onSuccess: async () => {
        setStatus('Front page updated.');
        await queryClient.invalidateQueries(trpc.portfolio.frontPage.list.queryFilter());
        await queryClient.invalidateQueries(trpc.portfolio.list.queryFilter());
      },
      onError: (error) => setStatus(errorMessage(error)),
    }),
  );

  const updateMutation = useMutation(
    trpc.portfolio.update.mutationOptions({
      onSuccess: async () => {
        setStatus('Saved.');
        await queryClient.invalidateQueries(trpc.portfolio.frontPage.list.queryFilter());
      },
      onError: (error) => setStatus(errorMessage(error)),
    }),
  );

  const items = listQuery.data?.items ?? [];

  const persistOrder = async (ordered: typeof items) => {
    setStatus('Saving order…');
    await reorderMutation.mutateAsync({ orderedIds: ordered.map((row) => row.id) });
  };

  return (
    <>
      <AdminSectionHeading>Front-page set</AdminSectionHeading>
      <p className={`mt-2 text-sm ${adminClass.fgMuted}`}>
        Reorder with the arrows. Set one hero for the carousel. Add photos from{' '}
        <a className={adminClass.link} href="/admin/portfolio/library">
          Library
        </a>
        .
      </p>
      <AdminStatusLine className="mt-4">
        {listQuery.isPending
          ? 'Loading…'
          : listQuery.isError
            ? errorMessage(listQuery.error)
            : (status ?? `${items.length} photo(s) on the front page.`)}
      </AdminStatusLine>
      <ul className="admin-photo-grid mt-6">
        {items.map((photo, index) => {
          const thumbUrl = portfolioVariantPublicUrl(
            photo.id,
            THUMB_VARIANT.suffix,
            photo.updatedAt,
          );
          return (
            <li key={photo.id} className="admin-photo-grid__tile">
              <img src={thumbUrl} alt="" className="admin-photo-grid__img" />
              <div className="admin-photo-grid__meta">
                <span className="text-xs">{photo.title?.trim() || photo.id}</span>
                <label className={`mt-2 flex items-center gap-2 text-xs ${adminClass.fgMuted}`}>
                  <input
                    type="checkbox"
                    checked={photo.hero}
                    disabled={updateMutation.isPending}
                    onChange={(event) => {
                      void updateMutation.mutateAsync({
                        id: photo.id,
                        data: { hero: event.target.checked },
                      });
                    }}
                  />
                  Hero
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <AdminPrimaryButton
                    type="button"
                    disabled={index === 0 || reorderMutation.isPending}
                    onClick={() => {
                      void persistOrder(moveItem(items, index, index - 1));
                    }}
                  >
                    ↑
                  </AdminPrimaryButton>
                  <AdminPrimaryButton
                    type="button"
                    disabled={index === items.length - 1 || reorderMutation.isPending}
                    onClick={() => {
                      void persistOrder(moveItem(items, index, index + 1));
                    }}
                  >
                    ↓
                  </AdminPrimaryButton>
                  <button
                    type="button"
                    className={`text-xs ${adminClass.linkMuted}`}
                    disabled={membershipMutation.isPending}
                    onClick={() => {
                      void membershipMutation.mutateAsync({ id: photo.id, onFrontPage: false });
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="admin-footnote mt-6">
        <a className={adminClass.link} href="/" target="_blank" rel="noreferrer">
          View on site
        </a>
      </p>
    </>
  );
}

export default function PortfolioFrontPageAdmin() {
  return (
    <AdminTrpcProvider>
      <PortfolioFrontPageAdminInner />
    </AdminTrpcProvider>
  );
}
