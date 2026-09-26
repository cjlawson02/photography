import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { expiresAtToDatetimeLocal } from '../../lib/admin/admin-form-datetime.ts';
import {
  reviewCollectionExpiresFieldSchema,
  reviewCollectionTitleFieldSchema,
} from '../../lib/admin/admin-form-schemas.ts';
import type { ReviewCollectionAdminUpdateBody } from '../../lib/admin/review-collection-schemas.ts';
import type {
  AdminReviewCollectionDetail,
  AdminReviewCollectionDetailPhoto,
} from '../../lib/admin/trpc-types.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import {
  errorMessage,
  formatAdminDimensions,
  formatAdminTime,
  normalizeNullableText,
} from './admin-format.ts';
import { adminClass } from './admin-styles.ts';
import AdminPhotoUpload from './AdminPhotoUpload.tsx';
import AdminSectionHeading from './AdminSectionHeading.tsx';
import AdminStatusLine from './AdminStatusLine.tsx';
import { AdminTable, AdminTableHead, AdminTableHeaderCell, AdminTableRow } from './AdminTable.tsx';

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
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(reviewCollectionTitleFieldSchema),
    values: { title: value ?? '' },
  });

  return (
    <input
      type="text"
      className={`block w-full max-w-md text-sm ${adminClass.field}`}
      aria-label="Collection title"
      placeholder="—"
      disabled={busy}
      {...register('title', {
        onBlur: () => {
          void handleSubmit((data) => {
            if (data.title === normalizeNullableText(value)) return;
            onSave(data.title);
          })();
        },
      })}
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
  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(reviewCollectionExpiresFieldSchema),
    values: { expiresAtLocal: expiresAtToDatetimeLocal(value) },
  });

  return (
    <input
      type="datetime-local"
      className={`block w-full max-w-md text-sm ${adminClass.field}`}
      aria-label="Collection expiry"
      disabled={busy}
      {...register('expiresAtLocal', {
        onBlur: () => {
          void handleSubmit(
            (data) => {
              if (data.expiresAt === value) return;
              onSave(data.expiresAt);
            },
            (errors) => {
              const message = errors.expiresAtLocal?.message;
              reset({ expiresAtLocal: expiresAtToDatetimeLocal(value) });
              onInvalid(typeof message === 'string' ? message : 'Invalid expiry date.');
            },
          )();
        },
      })}
    />
  );
}

type ReviewCollectionDetailAdminInnerProps = {
  collectionId: string;
  initialDetail?: AdminReviewCollectionDetail;
};

function ReviewCollectionDetailAdminInner({
  collectionId,
  initialDetail,
}: ReviewCollectionDetailAdminInnerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [initialDataUpdatedAt] = useState(() => Date.now());
  const detailQuery = useQuery({
    ...trpc.review.collections.detail.queryOptions({ id: collectionId }),
    ...(initialDetail !== undefined ? { initialData: initialDetail, initialDataUpdatedAt } : {}),
  });

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
          <dl className={`mt-6 grid gap-3 text-sm sm:grid-cols-2 ${adminClass.fg}`}>
            <div>
              <dt className={adminClass.fgMuted}>Slug</dt>
              <dd className="mt-0.5 font-mono text-xs">{detail.collection.slug}</dd>
            </div>
            <div>
              <dt className={adminClass.fgMuted}>Title</dt>
              <dd className="mt-0.5">
                <CollectionTitleInput
                  value={detail.collection.title}
                  busy={updateMutation.isPending}
                  onSave={(title) => patchCollection({ title })}
                />
              </dd>
            </div>
            <div>
              <dt className={adminClass.fgMuted}>Expires</dt>
              <dd className="mt-0.5 text-xs">
                <CollectionExpiresInput
                  value={detail.collection.expiresAt}
                  busy={updateMutation.isPending}
                  onSave={(expiresAt) => patchCollection({ expiresAt })}
                  onInvalid={(message) => setEditStatus(message)}
                />
                <span className={`mt-1 block ${adminClass.fgMuted}`}>
                  {detail.collection.expiresAt == null
                    ? 'No expiry — link stays active until revoked.'
                    : `Shown: ${formatAdminTime(detail.collection.expiresAt)}`}
                </span>
              </dd>
            </div>
            <div>
              <dt className={adminClass.fgMuted}>Client link</dt>
              <dd className="mt-0.5 text-xs">
                {reviewPath ? (
                  <a href={reviewPath} className={adminClass.link}>
                    {reviewPath}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className={adminClass.fgMuted}>Collection id</dt>
              <dd className={`mt-0.5 font-mono text-xs ${adminClass.fgMuted}`}>
                {detail.collection.id}
              </dd>
            </div>
          </dl>
          {editStatus ? <AdminStatusLine className="mt-2">{editStatus}</AdminStatusLine> : null}

          <section
            id="upload"
            className={`mt-8 scroll-mt-8 ${adminClass.uploadSection}`}
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
                          className={adminClass.thumb}
                        />
                      </a>
                    ) : (
                      <span className={`text-xs ${adminClass.fgMuted}`}>—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 align-middle font-mono text-xs">{photo.status}</td>
                  <td
                    className={`py-2 pr-4 align-middle text-xs tabular-nums ${adminClass.fgMuted}`}
                  >
                    {formatAdminDimensions(photo.width, photo.height)}
                  </td>
                  <td className="py-2 pr-4 align-middle text-xs">
                    {selectionLabel(photo.selectionStatus)}
                  </td>
                  <td className="py-2 pr-4 align-middle text-xs">
                    {formatAdminTime(photo.updatedAt)}
                  </td>
                  <td className={`py-2 pr-4 align-middle font-mono text-xs ${adminClass.fgMuted}`}>
                    {photo.id}
                  </td>
                  <td className="py-2 align-middle">
                    <button
                      type="button"
                      className={`text-xs ${adminClass.linkMuted} ${adminClass.accent}`}
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
  initialDetail?: AdminReviewCollectionDetail;
};

export default function ReviewCollectionDetailAdmin({
  collectionId,
  initialDetail,
}: ReviewCollectionDetailAdminProps) {
  return (
    <AdminTrpcProvider>
      <ReviewCollectionDetailAdminInner collectionId={collectionId} initialDetail={initialDetail} />
    </AdminTrpcProvider>
  );
}
