import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { expiresAtToDatetimeLocal } from '../../lib/admin/admin-form-datetime.ts';
import {
  reviewCollectionExpiresFieldSchema,
  reviewCollectionNotesFieldSchema,
  reviewCollectionPersonNameFieldSchema,
  reviewCollectionTitleFieldSchema,
} from '../../lib/admin/admin-form-schemas.ts';
import type { ReviewCollectionAdminUpdateBody } from '../../lib/admin/review-collection-schemas.ts';
import type {
  AdminReviewCollectionDetail,
  AdminReviewCollectionDetailPhoto,
} from '../../lib/admin/trpc-types.ts';
import { jobStepPrimaryAction } from '../../lib/review/job-steps.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import AdminJobStepRail, { AdminJobStatusBadge } from './AdminJobStepRail.tsx';
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

type CollectionTextInputProps = {
  label: string;
  value: string | null;
  busy: boolean;
  onSave: (value: string | null) => void;
};

function CollectionPersonNameInput({
  value,
  busy,
  onSave,
}: Omit<CollectionTextInputProps, 'label'>) {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(reviewCollectionPersonNameFieldSchema),
    values: { personName: value ?? '' },
  });
  return (
    <input
      type="text"
      className={`block w-full max-w-md text-sm ${adminClass.field}`}
      aria-label="Person name"
      disabled={busy}
      {...register('personName', {
        onBlur: () => {
          void handleSubmit((data) => {
            if (data.personName === normalizeNullableText(value)) return;
            onSave(data.personName);
          })();
        },
      })}
    />
  );
}

function CollectionTitleInput({ value, busy, onSave }: Omit<CollectionTextInputProps, 'label'>) {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(reviewCollectionTitleFieldSchema),
    values: { title: value ?? '' },
  });
  return (
    <input
      type="text"
      className={`block w-full max-w-md text-sm ${adminClass.field}`}
      aria-label="Shoot title"
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

function CollectionNotesInput({ value, busy, onSave }: Omit<CollectionTextInputProps, 'label'>) {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(reviewCollectionNotesFieldSchema),
    values: { notes: value ?? '' },
  });
  return (
    <textarea
      rows={3}
      className={`block w-full max-w-md text-sm ${adminClass.field}`}
      aria-label="Shoot notes"
      disabled={busy}
      {...register('notes', {
        onBlur: () => {
          void handleSubmit((data) => {
            if (data.notes === normalizeNullableText(value ?? '')) return;
            onSave(data.notes);
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
      aria-label="Shoot expiry"
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

type ShootJobAdminInnerProps = {
  collectionId: string;
  initialDetail?: AdminReviewCollectionDetail;
};

function ShootJobAdminInner({ collectionId, initialDetail }: ShootJobAdminInnerProps) {
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

  const transitionMutation = useMutation(
    trpc.review.collections.transition.mutationOptions({
      onSuccess: async () => {
        setEditStatus('Job step updated.');
        await queryClient.invalidateQueries(trpc.review.collections.detail.queryFilter());
        await queryClient.invalidateQueries(trpc.review.collections.list.queryFilter());
      },
      onError: (error) => {
        setEditStatus(errorMessage(error));
      },
    }),
  );

  const promoteFinalMutation = useMutation(
    trpc.review.collections.promoteFinal.mutationOptions({
      onSuccess: async () => {
        setEditStatus('Promoted to portfolio — fill details in Library.');
        await queryClient.invalidateQueries(trpc.review.collections.detail.queryFilter());
      },
      onError: (error) => {
        setEditStatus(errorMessage(error));
      },
    }),
  );

  const purgeRoundsMutation = useMutation(
    trpc.review.collections.purgeRounds.mutationOptions({
      onSuccess: async () => {
        setEditStatus('Storage purged for selected rounds.');
        await queryClient.invalidateQueries(trpc.review.collections.detail.queryFilter());
      },
      onError: (error) => {
        setEditStatus(errorMessage(error));
      },
    }),
  );

  const markDeliveredMutation = useMutation(
    trpc.review.collections.markDelivered.mutationOptions({
      onSuccess: async () => {
        setEditStatus('Finals marked delivered — client link is in download mode.');
        await queryClient.invalidateQueries(trpc.review.collections.detail.queryFilter());
        await queryClient.invalidateQueries(trpc.review.collections.list.queryFilter());
      },
      onError: (error) => {
        setEditStatus(errorMessage(error));
      },
    }),
  );

  const linkFinalMutation = useMutation(
    trpc.review.collections.linkFinalToPick.mutationOptions({
      onSuccess: async () => {
        setEditStatus('Final linked to pick.');
        await queryClient.invalidateQueries(trpc.review.collections.detail.queryFilter());
      },
      onError: (error) => {
        setEditStatus(errorMessage(error));
      },
    }),
  );

  const reopenPicksMutation = useMutation(
    trpc.review.collections.reopenPicks.mutationOptions({
      onSuccess: async () => {
        setEditStatus('Picks reopened — client can change selections again.');
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
    updateMutation.isPending ||
    deletePhotoMutation.isPending ||
    transitionMutation.isPending ||
    reopenPicksMutation.isPending ||
    markDeliveredMutation.isPending ||
    promoteFinalMutation.isPending ||
    purgeRoundsMutation.isPending ||
    linkFinalMutation.isPending ||
    busyPhotoId !== null;

  const copyFilenames = async () => {
    setEditStatus('Preparing filenames…');
    try {
      const result = await queryClient.fetchQuery(
        trpc.review.collections.exportPickFilenames.queryOptions({ id: collectionId }),
      );
      await navigator.clipboard.writeText(result.text);
      setEditStatus(
        result.filenames.length === 0
          ? 'No picks to export yet.'
          : `Copied ${result.filenames.length} filename(s) for Lightroom.`,
      );
      await queryClient.invalidateQueries(trpc.review.collections.detail.queryFilter());
      await queryClient.invalidateQueries(trpc.review.collections.list.queryFilter());
    } catch (error) {
      setEditStatus(errorMessage(error));
    }
  };

  const statusMessage = detailQuery.isPending
    ? 'Loading…'
    : detailQuery.isError
      ? errorMessage(detailQuery.error)
      : null;

  const detail = detailQuery.data;
  const photos = detail?.photos ?? [];
  const finalsSummary = detail?.finals;
  const finalPhotos = finalsSummary?.photos ?? [];
  const collection = detail?.collection;
  const pickCandidates = photos.filter(
    (photo) => photo.selectionStatus === 'selected' || photo.selectionStatus === 'approved',
  );

  const selectionCounts = photos.reduce(
    (acc, photo) => {
      acc[photo.selectionStatus] += 1;
      return acc;
    },
    { none: 0, selected: 0, approved: 0 },
  );

  const reviewPath = collection ? `/review/${encodeURIComponent(collection.slug)}` : '/review';
  const hasReadyFinals = (finalsSummary?.readyCount ?? 0) > 0;

  const primaryAction = useMemo(
    () =>
      jobStepPrimaryAction({
        status: collection?.status ?? 'setup',
        reviewPath,
        uploadAnchor: '#upload-proofs',
        finalsUploadAnchor: '#upload-finals',
        hasReadyFinals,
      }),
    [collection?.status, reviewPath, hasReadyFinals],
  );

  const copyDeliveryMessage = async () => {
    setEditStatus('Preparing message…');
    try {
      const result = await queryClient.fetchQuery(
        trpc.review.collections.deliveryMessage.queryOptions({ id: collectionId }),
      );
      await navigator.clipboard.writeText(result.text);
      setEditStatus('Copied delivery message for the client.');
    } catch (error) {
      setEditStatus(errorMessage(error));
    }
  };

  const jobDisplayName =
    collection?.personName?.trim() || collection?.title?.trim() || collection?.slug || 'Shoot job';

  return (
    <>
      {collection ? (
        <AdminJobStepRail
          status={collection.status}
          reviewPath={reviewPath}
          primaryAction={primaryAction}
          markSharedPending={transitionMutation.isPending}
          onMarkShared={() => {
            if (primaryAction.kind !== 'mark_shared') return;
            setEditStatus('Updating step…');
            void transitionMutation.mutateAsync({
              id: collectionId,
              to: primaryAction.targetStatus,
            });
          }}
          copyFilenamesPending={photoActionsBusy}
          onCopyFilenames={() => {
            void copyFilenames();
          }}
          reopenPicksPending={reopenPicksMutation.isPending}
          onReopenPicks={() => {
            if (
              !confirm(
                'Reopen picks? The client will be able to change selections on the review link again.',
              )
            ) {
              return;
            }
            setEditStatus('Reopening picks…');
            void reopenPicksMutation.mutateAsync({ id: collectionId });
          }}
          markDeliveredPending={markDeliveredMutation.isPending}
          onMarkDelivered={() => {
            if (
              !confirm(
                'Mark finals delivered? The client link switches to download mode for uploaded finals.',
              )
            ) {
              return;
            }
            setEditStatus('Updating step…');
            void markDeliveredMutation.mutateAsync({ id: collectionId });
          }}
          markClosedPending={transitionMutation.isPending}
          onMarkClosed={() => {
            if (!confirm('Mark this shoot closed? You can still purge storage below.')) return;
            setEditStatus('Closing shoot…');
            void transitionMutation.mutateAsync({ id: collectionId, to: 'closed' });
          }}
          copyDeliveryMessagePending={photoActionsBusy}
          onCopyDeliveryMessage={() => {
            void copyDeliveryMessage();
          }}
        />
      ) : null}

      <AdminStatusLine className="mt-4">
        {statusMessage ??
          (photos.length === 0
            ? 'No proofs yet — use Upload proofs on the step rail.'
            : `${photos.length} proof(s) · ${selectionCounts.selected} selected · ${selectionCounts.approved} approved`)}
      </AdminStatusLine>

      {collection ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <h2 className={`text-lg font-medium ${adminClass.fg}`}>{jobDisplayName}</h2>
            <AdminJobStatusBadge status={collection.status} />
          </div>

          <dl className={`mt-6 grid gap-3 text-sm sm:grid-cols-2 ${adminClass.fg}`}>
            <div>
              <dt className={adminClass.fgMuted}>Person</dt>
              <dd className="mt-0.5">
                <CollectionPersonNameInput
                  value={collection.personName}
                  busy={updateMutation.isPending}
                  onSave={(personName) => patchCollection({ personName })}
                />
              </dd>
            </div>
            <div>
              <dt className={adminClass.fgMuted}>Title</dt>
              <dd className="mt-0.5">
                <CollectionTitleInput
                  value={collection.title}
                  busy={updateMutation.isPending}
                  onSave={(title) => patchCollection({ title })}
                />
              </dd>
            </div>
            <div>
              <dt className={adminClass.fgMuted}>Expires</dt>
              <dd className="mt-0.5 text-xs">
                <CollectionExpiresInput
                  value={collection.expiresAt}
                  busy={updateMutation.isPending}
                  onSave={(expiresAt) => patchCollection({ expiresAt })}
                  onInvalid={(message) => setEditStatus(message)}
                />
                <span className={`mt-1 block ${adminClass.fgMuted}`}>
                  {collection.expiresAt == null
                    ? 'No expiry — link stays active until revoked.'
                    : `Shown: ${formatAdminTime(collection.expiresAt)}`}
                </span>
              </dd>
            </div>
            <div>
              <dt className={adminClass.fgMuted}>Client link</dt>
              <dd className="mt-0.5 text-xs">
                <a href={reviewPath} className={adminClass.link}>
                  {reviewPath}
                </a>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className={adminClass.fgMuted}>Notes</dt>
              <dd className="mt-0.5">
                <CollectionNotesInput
                  value={collection.notes}
                  busy={updateMutation.isPending}
                  onSave={(notes) => patchCollection({ notes })}
                />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className={adminClass.fgMuted}>Collection id</dt>
              <dd className={`mt-0.5 font-mono text-xs ${adminClass.fgMuted}`}>{collection.id}</dd>
            </div>
          </dl>
          {editStatus ? <AdminStatusLine className="mt-2">{editStatus}</AdminStatusLine> : null}

          <section
            id="upload-proofs"
            className={`mt-8 scroll-mt-8 ${adminClass.uploadSection}`}
            aria-label="Upload review photo"
          >
            <AdminSectionHeading>Upload proofs</AdminSectionHeading>
            <div className="mt-3">
              <AdminPhotoUpload
                bucket="review"
                collectionId={collectionId}
                compact
                onSuccess={async () => {
                  setEditStatus('Upload complete.');
                  await queryClient.invalidateQueries(trpc.review.collections.detail.queryFilter());
                  await queryClient.invalidateQueries(trpc.review.collections.list.queryFilter());
                }}
              />
            </div>
          </section>

          {collection.status === 'editing' ||
          collection.status === 'finals_delivered' ||
          collection.status === 'closed' ? (
            <section
              id="upload-finals"
              className={`mt-8 scroll-mt-8 ${adminClass.uploadSection}`}
              aria-label="Upload delivery finals"
            >
              <AdminSectionHeading>Upload finals</AdminSectionHeading>
              <p className={`mt-2 text-sm ${adminClass.fgMuted}`}>
                Filenames are matched to picks automatically when they line up. Unmatched finals can
                be linked manually below.
              </p>
              <div className="mt-3">
                <AdminPhotoUpload
                  bucket="review"
                  collectionId={collectionId}
                  reviewRound="final"
                  compact
                  onSuccess={async () => {
                    setEditStatus('Final upload complete.');
                    await queryClient.invalidateQueries(
                      trpc.review.collections.detail.queryFilter(),
                    );
                  }}
                />
              </div>
              {finalsSummary && finalsSummary.unmatchedCount > 0 ? (
                <p className={`mt-3 text-sm ${adminClass.fgMuted}`}>
                  {finalsSummary.unmatchedCount} final(s) still need a pick match.
                </p>
              ) : null}
            </section>
          ) : null}

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
                    <div className="flex flex-col gap-1">
                      {photo.status === 'failed' || photo.status === 'pending' ? (
                        <button
                          type="button"
                          className={`text-xs ${adminClass.linkMuted}`}
                          disabled={photoActionsBusy}
                          onClick={() => {
                            setBusyPhotoId(photo.id);
                            setEditStatus('Reprocessing…');
                            void requestReprocess({ id: photo.id, bucket: 'review' })
                              .then(async () => {
                                setEditStatus('Reprocess started.');
                                await queryClient.invalidateQueries(
                                  trpc.review.collections.detail.queryFilter(),
                                );
                              })
                              .catch((error) => setEditStatus(errorMessage(error)))
                              .finally(() => setBusyPhotoId(null));
                          }}
                        >
                          Retry
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`text-xs ${adminClass.linkMuted} ${adminClass.accent}`}
                        disabled={photoActionsBusy}
                        onClick={() => {
                          void deletePhoto(photo.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminTable>

          {finalPhotos.length > 0 ? (
            <AdminTable className="mt-8">
              <AdminTableHead>
                <AdminTableHeaderCell>Final preview</AdminTableHeaderCell>
                <AdminTableHeaderCell>Filename</AdminTableHeaderCell>
                <AdminTableHeaderCell>Matched pick</AdminTableHeaderCell>
                <AdminTableHeaderCell>Ingest</AdminTableHeaderCell>
                <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
              </AdminTableHead>
              <tbody>
                {finalPhotos.map((photo) => (
                  <AdminTableRow key={photo.id}>
                    <td className="py-3 pr-4 align-middle">
                      {photo.thumbUrl ? (
                        <img
                          src={photo.thumbUrl}
                          alt=""
                          width={72}
                          height={54}
                          className={adminClass.thumb}
                        />
                      ) : (
                        <span className={`text-xs ${adminClass.fgMuted}`}>—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 align-middle text-xs">
                      {photo.originalFilename ?? '—'}
                    </td>
                    <td className="py-2 pr-4 align-middle text-xs">
                      {photo.matchedPickId ? (
                        <span className={adminClass.fgMuted}>{photo.matchedPickId}</span>
                      ) : (
                        <select
                          className={`text-xs ${adminClass.field}`}
                          disabled={photoActionsBusy || pickCandidates.length === 0}
                          defaultValue=""
                          onChange={(event) => {
                            const pickPhotoId = event.target.value;
                            if (!pickPhotoId) return;
                            void linkFinalMutation.mutateAsync({
                              collectionId,
                              finalPhotoId: photo.id,
                              pickPhotoId,
                            });
                          }}
                        >
                          <option value="">Link to pick…</option>
                          {pickCandidates.map((pick) => (
                            <option key={pick.id} value={pick.id}>
                              {pick.originalFilename ?? pick.id}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2 pr-4 align-middle font-mono text-xs">{photo.status}</td>
                    <td className="py-2 align-middle">
                      <div className="flex flex-col gap-1">
                        {photo.status === 'failed' || photo.status === 'pending' ? (
                          <button
                            type="button"
                            className={`text-xs ${adminClass.linkMuted}`}
                            disabled={photoActionsBusy}
                            onClick={() => {
                              setBusyPhotoId(photo.id);
                              void requestReprocess({ id: photo.id, bucket: 'review' })
                                .then(async () => {
                                  setEditStatus('Reprocess started.');
                                  await queryClient.invalidateQueries(
                                    trpc.review.collections.detail.queryFilter(),
                                  );
                                })
                                .catch((error) => setEditStatus(errorMessage(error)))
                                .finally(() => setBusyPhotoId(null));
                            }}
                          >
                            Retry
                          </button>
                        ) : null}
                        {photo.status === 'ready' ? (
                          <button
                            type="button"
                            className={`text-xs ${adminClass.linkMuted}`}
                            disabled={photoActionsBusy}
                            onClick={() => {
                              void promoteFinalMutation.mutateAsync({
                                collectionId,
                                finalPhotoId: photo.id,
                              });
                            }}
                          >
                            Promote
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          ) : null}

          {collection.status === 'closed' ? (
            <section className={`mt-8 rounded border p-4 ${adminClass.uploadSection}`}>
              <AdminSectionHeading>Retention</AdminSectionHeading>
              <p className={`mt-2 text-sm ${adminClass.fgMuted}`}>
                Purge deletes rows and R2 objects for the selected rounds. Type the shoot slug{' '}
                <code className="admin-code">{collection.slug}</code> to confirm.
              </p>
              <form
                className="mt-4 flex flex-wrap items-end gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const confirmSlug = String(data.get('confirmSlug') ?? '');
                  void purgeRoundsMutation.mutateAsync({
                    collectionId,
                    proofs: data.get('purgeProofs') === 'on',
                    finals: data.get('purgeFinals') === 'on',
                    cleanupR2: true,
                    confirmSlug,
                  });
                }}
              >
                <label className={`flex items-center gap-2 text-sm ${adminClass.fg}`}>
                  <input type="checkbox" name="purgeProofs" />
                  Purge proofs
                </label>
                <label className={`flex items-center gap-2 text-sm ${adminClass.fg}`}>
                  <input type="checkbox" name="purgeFinals" />
                  Purge finals
                </label>
                <input
                  type="text"
                  name="confirmSlug"
                  placeholder="Shoot slug"
                  className={`max-w-xs text-sm ${adminClass.field}`}
                  aria-label="Confirm shoot slug"
                />
                <button type="submit" className={adminClass.btnPrimary} disabled={photoActionsBusy}>
                  Purge selected
                </button>
              </form>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}

type ShootJobAdminProps = {
  collectionId: string;
  initialDetail?: AdminReviewCollectionDetail;
};

export default function ShootJobAdmin({ collectionId, initialDetail }: ShootJobAdminProps) {
  return (
    <AdminTrpcProvider>
      <ShootJobAdminInner collectionId={collectionId} initialDetail={initialDetail} />
    </AdminTrpcProvider>
  );
}
