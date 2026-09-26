import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { ReviewCollectionAdminUpdateBody } from '../../lib/admin/review-collection-schemas.ts';
import type { AdminReviewCollectionDetailPhoto } from '../../lib/admin/trpc-types.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import {
  errorMessage,
  formatAdminDimensions,
  formatAdminTime,
  normalizeNullableText,
} from './admin-format.ts';
import {
  adminAccentStyle,
  adminBorderStyle,
  adminFieldStyle,
  adminFgMutedStyle,
  adminFgStyle,
} from './admin-styles.ts';
import AdminPhotoUpload from './AdminPhotoUpload.tsx';
import AdminSectionHeading from './AdminSectionHeading.tsx';
import AdminStatusLine from './AdminStatusLine.tsx';
import { AdminTable, AdminTableHead, AdminTableHeaderCell, AdminTableRow } from './AdminTable.tsx';

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
      style={adminFieldStyle}
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
      style={adminFieldStyle}
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
          onInvalid(errorMessage(error));
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
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const detailQuery = useQuery(trpc.review.collections.detail.queryOptions({ id: collectionId }));

  const updateMutation = useMutation(
    trpc.review.collections.update.mutationOptions({
      onSuccess: async () => {
        setEditStatus('Saved.');
        await queryClient.invalidateQueries(trpc.review.collections.detail.queryFilter());
        await queryClient.invalidateQueries(trpc.review.collections.list.queryFilter());
      },
      onError: (error) => {
        setEditStatus(errorMessage(error));
      },
    }),
  );

  const deletePhotoMutation = useMutation(
    trpc.review.collections.deletePhoto.mutationOptions({
      onSuccess: async () => {
        setEditStatus('Photo deleted.');
        await queryClient.invalidateQueries(trpc.review.collections.detail.queryFilter());
      },
      onError: (error) => {
        setEditStatus(errorMessage(error));
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

  const deletePhoto = async (photoId: string) => {
    if (!confirm(`Delete review photo ${photoId}? Storage objects will be removed.`)) return;
    setBusyPhotoId(photoId);
    setEditStatus('Deleting…');
    try {
      await deletePhotoMutation.mutateAsync({ collectionId, photoId });
    } catch {
      /* onError sets editStatus */
    } finally {
      setBusyPhotoId(null);
    }
  };

  const photoActionsBusy =
    updateMutation.isPending || deletePhotoMutation.isPending || busyPhotoId !== null;

  const statusMessage = detailQuery.isPending
    ? 'Loading…'
    : detailQuery.isError
      ? errorMessage(detailQuery.error)
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
      <AdminStatusLine>
        {statusMessage ??
          (photos.length === 0
            ? 'No photos in this collection yet — upload below.'
            : `${photos.length} photo(s) · ${selectionCounts.selected} selected · ${selectionCounts.approved} approved`)}
      </AdminStatusLine>

      {detail ? (
        <>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2" style={adminFgStyle}>
            <div>
              <dt style={adminFgMutedStyle}>Slug</dt>
              <dd className="mt-0.5 font-mono text-xs">{detail.collection.slug}</dd>
            </div>
            <div>
              <dt style={adminFgMutedStyle}>Title</dt>
              <dd className="mt-0.5">
                <CollectionTitleInput
                  value={detail.collection.title}
                  busy={updateMutation.isPending}
                  onSave={(title) => patchCollection({ title })}
                />
              </dd>
            </div>
            <div>
              <dt style={adminFgMutedStyle}>Expires</dt>
              <dd className="mt-0.5 text-xs">
                <CollectionExpiresInput
                  value={detail.collection.expiresAt}
                  busy={updateMutation.isPending}
                  onSave={(expiresAt) => patchCollection({ expiresAt })}
                  onInvalid={(message) => setEditStatus(message)}
                />
                <span className="mt-1 block" style={adminFgMutedStyle}>
                  {detail.collection.expiresAt == null
                    ? 'No expiry — link stays active until revoked.'
                    : `Shown: ${formatAdminTime(detail.collection.expiresAt)}`}
                </span>
              </dd>
            </div>
            <div>
              <dt style={adminFgMutedStyle}>Client link</dt>
              <dd className="mt-0.5 text-xs">
                {reviewPath ? (
                  <a href={reviewPath} style={adminAccentStyle}>
                    {reviewPath}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt style={adminFgMutedStyle}>Collection id</dt>
              <dd className="mt-0.5 font-mono text-xs" style={adminFgMutedStyle}>
                {detail.collection.id}
              </dd>
            </div>
          </dl>
          {editStatus ? <AdminStatusLine className="mt-2">{editStatus}</AdminStatusLine> : null}

          <section
            id="upload"
            className="mt-8 scroll-mt-8 rounded border p-4"
            style={adminBorderStyle}
            aria-label="Upload review photo"
          >
            <AdminSectionHeading>Upload</AdminSectionHeading>
            <div className="mt-3">
              <AdminPhotoUpload
                bucket="review"
                collectionId={collectionId}
                compact
                onSuccess={async () => {
                  setEditStatus('Upload complete.');
                  await queryClient.invalidateQueries(trpc.review.collections.detail.queryFilter());
                }}
              />
            </div>
          </section>

          <AdminTable className="mt-8">
            <AdminTableHead>
              <AdminTableHeaderCell>Preview</AdminTableHeaderCell>
              <AdminTableHeaderCell>Ingest</AdminTableHeaderCell>
              <AdminTableHeaderCell>Size</AdminTableHeaderCell>
              <AdminTableHeaderCell>Selection</AdminTableHeaderCell>
              <AdminTableHeaderCell>Updated</AdminTableHeaderCell>
              <AdminTableHeaderCell>Id</AdminTableHeaderCell>
              <AdminTableHeaderCell className="py-2">Actions</AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {photos.map((photo) => (
                <AdminTableRow key={photo.id}>
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
                            ...adminBorderStyle,
                            width: '4.5rem',
                            height: '3.375rem',
                          }}
                        />
                      </a>
                    ) : (
                      <span className="text-xs" style={adminFgMutedStyle}>
                        —
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 align-middle font-mono text-xs">{photo.status}</td>
                  <td
                    className="py-2 pr-4 align-middle text-xs tabular-nums"
                    style={adminFgMutedStyle}
                  >
                    {formatAdminDimensions(photo.width, photo.height)}
                  </td>
                  <td className="py-2 pr-4 align-middle text-xs">
                    {selectionLabel(photo.selectionStatus)}
                  </td>
                  <td className="py-2 pr-4 align-middle text-xs">
                    {formatAdminTime(photo.updatedAt)}
                  </td>
                  <td
                    className="py-2 pr-4 align-middle font-mono text-xs"
                    style={adminFgMutedStyle}
                  >
                    {photo.id}
                  </td>
                  <td className="py-2 align-middle">
                    <button
                      type="button"
                      className="text-xs underline"
                      style={adminAccentStyle}
                      disabled={photoActionsBusy}
                      onClick={() => {
                        void deletePhoto(photo.id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>
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
