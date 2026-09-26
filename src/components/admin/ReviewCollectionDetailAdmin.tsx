import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { ReviewCollectionAdminUpdateBody } from '../../lib/admin/review-collection-schemas.ts';
import type { AdminReviewCollectionDetailPhoto } from '../../lib/admin/trpc-types.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';

const borderStyle = { borderColor: 'var(--color-border)' };
const fieldStyle = {
  borderColor: 'var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-fg)',
};

function normalizeNullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

function expiresAtToDatetimeLocal(ms: number | null | undefined): string {
  if (ms == null) return '';
  const date = new Date(ms);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDatetimeLocal(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const ms = new Date(trimmed).getTime();
  if (Number.isNaN(ms)) {
    throw new Error('Invalid expiry date.');
  }
  return ms;
}

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

type CollectionTitleInputProps = {
  value: string | null;
  busy: boolean;
  onSave: (title: string | null) => void;
};

function CollectionTitleInput({ value, busy, onSave }: CollectionTitleInputProps) {
  const [draft, setDraft] = useState(() => value ?? '');
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value ?? '');
  }

  return (
    <input
      type="text"
      className="block w-full max-w-md border px-3 py-2 text-sm"
      style={fieldStyle}
      aria-label="Collection title"
      value={draft}
      placeholder="—"
      disabled={busy}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = normalizeNullableText(draft);
        if (next === normalizeNullableText(value)) return;
        onSave(next);
      }}
    />
  );
}

type CollectionExpiresInputProps = {
  value: number | null;
  busy: boolean;
  onSave: (expiresAt: number | null) => void;
  onInvalid: (message: string) => void;
};

function CollectionExpiresInput({ value, busy, onSave, onInvalid }: CollectionExpiresInputProps) {
  const [draft, setDraft] = useState(() => expiresAtToDatetimeLocal(value));
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(expiresAtToDatetimeLocal(value));
  }

  return (
    <input
      type="datetime-local"
      className="block w-full max-w-md border px-3 py-2 text-sm"
      style={fieldStyle}
      aria-label="Collection expiry"
      value={draft}
      disabled={busy}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        try {
          const next = parseDatetimeLocal(draft);
          if (next === value) return;
          onSave(next);
        } catch (error) {
          setDraft(expiresAtToDatetimeLocal(value));
          onInvalid(error instanceof Error ? error.message : String(error));
        }
      }}
    />
  );
}

type ReviewCollectionDetailAdminInnerProps = {
  collectionId: string;
};

function ReviewCollectionDetailAdminInner({ collectionId }: ReviewCollectionDetailAdminInnerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const detailQuery = useQuery(trpc.review.collections.detail.queryOptions({ id: collectionId }));

  const updateMutation = useMutation(
    trpc.review.collections.update.mutationOptions({
      onSuccess: async () => {
        setEditStatus('Saved.');
        await queryClient.invalidateQueries(trpc.review.collections.detail.queryFilter());
        await queryClient.invalidateQueries(trpc.review.collections.list.queryFilter());
      },
      onError: (error) => {
        setEditStatus(error instanceof Error ? error.message : String(error));
      },
    }),
  );

  const patchCollection = async (data: ReviewCollectionAdminUpdateBody) => {
    setEditStatus('Saving…');
    try {
      await updateMutation.mutateAsync({ id: collectionId, data });
    } catch {
      /* onError sets editStatus */
    }
  };

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
              <dd className="mt-0.5">
                <CollectionTitleInput
                  value={detail.collection.title}
                  busy={updateMutation.isPending}
                  onSave={(title) => patchCollection({ title })}
                />
              </dd>
            </div>
            <div>
              <dt style={{ color: 'var(--color-fg-muted)' }}>Expires</dt>
              <dd className="mt-0.5 text-xs">
                <CollectionExpiresInput
                  value={detail.collection.expiresAt}
                  busy={updateMutation.isPending}
                  onSave={(expiresAt) => patchCollection({ expiresAt })}
                  onInvalid={(message) => setEditStatus(message)}
                />
                <span className="mt-1 block" style={{ color: 'var(--color-fg-muted)' }}>
                  {detail.collection.expiresAt == null
                    ? 'No expiry — link stays active until revoked.'
                    : `Shown: ${formatTime(detail.collection.expiresAt)}`}
                </span>
              </dd>
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
          {editStatus ? (
            <p
              className="mt-2 text-xs"
              style={{ color: 'var(--color-fg-muted)' }}
              aria-live="polite"
            >
              {editStatus}
            </p>
          ) : null}

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
