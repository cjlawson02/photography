import { useCallback, useOptimistic, useState, useTransition } from 'react';

import type { SelectionStatus } from '../../db/schema/review/selection-status.ts';
import {
  galleryDisplayDimensions,
  galleryItemFromPhoto,
  openGalleryLightbox,
} from '../../lib/gallery/lightbox.ts';
import type { PublicReviewPhoto } from '../../lib/services/review-service.ts';
import { addToSet, removeFromSet } from '../../lib/util/immutable-set.ts';

type ReviewPhotoState = PublicReviewPhoto;

type Props = {
  slug: string;
  photos: ReviewPhotoState[];
  picksLocked?: boolean;
};

async function postSubmitPicks(slug: string) {
  const res = await fetch('/review/api/submit-picks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? 'Could not submit picks');
  }
}

type OptimisticAction = {
  photoId: string;
  selectionStatus: SelectionStatus;
};

async function postSelection(slug: string, photoId: string, selectionStatus: SelectionStatus) {
  const res = await fetch('/review/api/selection', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug, photoId, selectionStatus }),
  });
  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? 'Could not save selection');
  }
}

function selectButtonLabel(status: SelectionStatus): string {
  if (status === 'approved') return 'Approved';
  if (status === 'selected') return 'Selected';
  return 'Select';
}

function applyOptimistic(photos: ReviewPhotoState[], action: OptimisticAction): ReviewPhotoState[] {
  return photos.map((photo) =>
    photo.id === action.photoId ? { ...photo, selectionStatus: action.selectionStatus } : photo,
  );
}

export default function ReviewGallery({
  slug,
  photos: initialPhotos,
  picksLocked: initialPicksLocked = false,
}: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [picksLocked, setPicksLocked] = useState(initialPicksLocked);
  const [optimisticPhotos, setOptimisticPhotos] = useOptimistic(photos, applyOptimistic);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submittingPicks, setSubmittingPicks] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();

  const showError = useCallback((message: string) => {
    setStatusMessage(message);
  }, []);

  const openLightbox = (photoId: string) => {
    const items = optimisticPhotos.map((photo) =>
      galleryItemFromPhoto({
        galleryUrl: photo.galleryUrl,
        width: photo.width,
        height: photo.height,
      }),
    );
    const index = optimisticPhotos.findIndex((p) => p.id === photoId);
    if (index >= 0) openGalleryLightbox(items, index);
  };

  const saveSelection = (photoId: string, next: SelectionStatus, errorLabel: string) => {
    setPendingIds((prev) => addToSet(prev, photoId));
    startTransition(async () => {
      setOptimisticPhotos({ photoId, selectionStatus: next });
      try {
        await postSelection(slug, photoId, next);
        setPhotos((prev) =>
          prev.map((photo) => (photo.id === photoId ? { ...photo, selectionStatus: next } : photo)),
        );
        setStatusMessage(null);
      } catch (error) {
        showError(error instanceof Error ? error.message : errorLabel);
      } finally {
        setPendingIds((prev) => removeFromSet(prev, photoId));
      }
    });
  };

  const onToggleSelect = (photoId: string, current: SelectionStatus) => {
    if (picksLocked) return;
    const next: SelectionStatus = current === 'none' ? 'selected' : 'none';
    saveSelection(photoId, next, 'Could not save selection');
  };

  const onToggleApprove = (photoId: string, current: SelectionStatus) => {
    if (picksLocked) return;
    const next: SelectionStatus = current === 'approved' ? 'selected' : 'approved';
    saveSelection(photoId, next, 'Could not save approval');
  };

  const pickCount = optimisticPhotos.filter(
    (photo) => photo.selectionStatus === 'selected' || photo.selectionStatus === 'approved',
  ).length;

  const onSubmitPicks = () => {
    if (picksLocked || submittingPicks) return;
    if (pickCount === 0) {
      if (
        !confirm(
          "You haven't selected any photos. Submit anyway? Your photographer will follow up.",
        )
      ) {
        return;
      }
    } else if (!confirm("I'm done choosing — lock my picks and notify my photographer?")) {
      return;
    }
    setSubmittingPicks(true);
    void (async () => {
      try {
        await postSubmitPicks(slug);
        setPicksLocked(true);
        setStatusMessage('Thanks — your picks are submitted.');
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Could not submit picks');
      } finally {
        setSubmittingPicks(false);
      }
    })();
  };

  return (
    <section
      className="public-wrap"
      style={{ paddingBlock: 'var(--space-4) var(--space-5)' }}
      aria-label="Review gallery"
    >
      {statusMessage ? (
        <output className="mb-4 block text-center text-sm" style={{ color: 'var(--color-accent)' }}>
          {statusMessage}
        </output>
      ) : null}

      {picksLocked ? (
        <p className="mb-4 text-center text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          Your picks are submitted — thank you. Contact Lawson Photography if you need changes.
        </p>
      ) : (
        <div className="mb-6 flex justify-center">
          <button
            type="button"
            className="public-action-btn"
            disabled={submittingPicks || optimisticPhotos.length === 0}
            onClick={onSubmitPicks}
          >
            {submittingPicks ? 'Submitting…' : "I'm done choosing"}
          </button>
        </div>
      )}

      {optimisticPhotos.length === 0 ? (
        <p className="text-center text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          No photos are ready in this collection yet.
        </p>
      ) : (
        <ul className="public-masonry-grid columns-2 sm:columns-3 lg:columns-4">
          {optimisticPhotos.map((photo) => {
            const busy = pendingIds.has(photo.id);
            const selected =
              photo.selectionStatus === 'selected' || photo.selectionStatus === 'approved';
            const { width, height } = galleryDisplayDimensions(photo);
            return (
              <li key={photo.id} className="public-masonry-item">
                <button
                  type="button"
                  className="block w-full cursor-pointer border-0 p-0"
                  style={{ background: 'transparent' }}
                  aria-label="View larger image"
                  onClick={() => openLightbox(photo.id)}
                >
                  <img
                    src={photo.galleryUrl}
                    alt=""
                    width={width}
                    height={height}
                    style={{ aspectRatio: `${width} / ${height}` }}
                    loading="lazy"
                    decoding="async"
                    className="public-masonry-img"
                  />
                </button>
                <div className="flex flex-wrap gap-2 px-1 py-2">
                  <button
                    type="button"
                    className="public-action-btn"
                    aria-pressed={selected}
                    disabled={busy || picksLocked}
                    onClick={() => onToggleSelect(photo.id, photo.selectionStatus)}
                  >
                    {selectButtonLabel(photo.selectionStatus)}
                  </button>
                  <button
                    type="button"
                    className="public-action-btn"
                    disabled={busy || picksLocked}
                    onClick={() => onToggleApprove(photo.id, photo.selectionStatus)}
                  >
                    {photo.selectionStatus === 'approved' ? 'Unapprove' : 'Approve'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
