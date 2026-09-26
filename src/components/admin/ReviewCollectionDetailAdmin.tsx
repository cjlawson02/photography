import { useQuery } from '@tanstack/react-query';

import type { AdminReviewCollectionDetailPhoto } from '../../lib/admin/trpc-types.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';

const borderStyle = { borderColor: 'var(--color-border)' };

function formatTime(ms: number | null | undefined): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString();
}

function formatDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
): string {
  if (width == null || height == null) return '—';
  return `${width}×${height}`;
}

function selectionLabel(status: AdminReviewCollectionDetailPhoto['selectionStatus']): string {
  switch (status) {
    case 'none':
      return 'None';
    case 'selected':
      return 'Selected';
    case 'approved':
      return 'Approved';
    default:
      return status;
  }
}

type ReviewCollectionDetailAdminInnerProps = {
  collectionId: string;
};

function ReviewCollectionDetailAdminInner({ collectionId }: ReviewCollectionDetailAdminInnerProps) {
  const trpc = useTRPC();
  const detailQuery = useQuery(trpc.review.collections.detail.queryOptions({ id: collectionId }));

  const statusMessage = detailQuery.isPending
    ? 'Loading…'
    : detailQuery.isError
      ? detailQuery.error instanceof Error
        ? detailQuery.error.message
        : String(detailQuery.error)
      : null;

  const detail = detailQuery.data;
  const photos = detail?.photos ?? [];

  const selectionCounts = photos.reduce(
    (acc, photo) => {
      acc[photo.selectionStatus] += 1;
      return acc;
    },
    { none: 0, selected: 0, approved: 0 },
  );

  const reviewPath = detail ? `/review/${encodeURIComponent(detail.collection.slug)}` : null;

  return (
    <>
      <p className="mt-4 text-xs" style={{ color: 'var(--color-fg-muted)' }} aria-live="polite">
        {statusMessage ??
          (photos.length === 0
            ? 'No photos in this collection yet — upload via Upload with this collection id.'
            : `${photos.length} photo(s) · ${selectionCounts.selected} selected · ${selectionCounts.approved} approved`)}
      </p>

      {detail ? (
        <>
          <dl
            className="mt-6 grid gap-3 text-sm sm:grid-cols-2"
            style={{ color: 'var(--color-fg)' }}
          >
            <div>
              <dt style={{ color: 'var(--color-fg-muted)' }}>Slug</dt>
              <dd className="mt-0.5 font-mono text-xs">{detail.collection.slug}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--color-fg-muted)' }}>Title</dt>
              <dd className="mt-0.5">{detail.collection.title ?? '—'}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--color-fg-muted)' }}>Expires</dt>
              <dd className="mt-0.5 text-xs">{formatTime(detail.collection.expiresAt)}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--color-fg-muted)' }}>Client link</dt>
              <dd className="mt-0.5 text-xs">
                {reviewPath ? (
                  <a href={reviewPath} style={{ color: 'var(--color-accent)' }}>
                    {reviewPath}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt style={{ color: 'var(--color-fg-muted)' }}>Collection id</dt>
              <dd className="mt-0.5 font-mono text-xs" style={{ color: 'var(--color-fg-muted)' }}>
                {detail.collection.id}
              </dd>
            </div>
          </dl>

          <div className="mt-8 overflow-x-auto">
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
                  <th className="py-2 pr-4 font-normal">Selection</th>
                  <th className="py-2 pr-4 font-normal">Updated</th>
                  <th className="py-2 font-normal">Id</th>
                </tr>
              </thead>
              <tbody>
                {photos.map((photo) => (
                  <tr key={photo.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="py-3 pr-4 align-middle">
                      {photo.thumbUrl ? (
                        <a
                          href={photo.galleryUrl ?? photo.thumbUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open gallery for photo ${photo.id}`}
                        >
                          <img
                            src={photo.thumbUrl}
                            alt=""
                            width={72}
                            height={54}
                            className="border object-cover"
                            style={{
                              ...borderStyle,
                              width: '4.5rem',
                              height: '3.375rem',
                            }}
                          />
                        </a>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
                          —
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 align-middle font-mono text-xs">{photo.status}</td>
                    <td
                      className="py-2 pr-4 align-middle text-xs tabular-nums"
                      style={{ color: 'var(--color-fg-muted)' }}
                    >
                      {formatDimensions(photo.width, photo.height)}
                    </td>
                    <td className="py-2 pr-4 align-middle text-xs">
                      {selectionLabel(photo.selectionStatus)}
                    </td>
                    <td className="py-2 pr-4 align-middle text-xs">
                      {formatTime(photo.updatedAt)}
                    </td>
                    <td
                      className="py-2 align-middle font-mono text-xs"
                      style={{ color: 'var(--color-fg-muted)' }}
                    >
                      {photo.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}

type ReviewCollectionDetailAdminProps = {
  collectionId: string;
};

export default function ReviewCollectionDetailAdmin({
  collectionId,
}: ReviewCollectionDetailAdminProps) {
  return (
    <AdminTrpcProvider>
      <ReviewCollectionDetailAdminInner collectionId={collectionId} />
    </AdminTrpcProvider>
  );
}
