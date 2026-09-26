import { useCallback, useState } from 'react';

import type { SelectionStatus } from '../../db/schema/review/selection-status.ts';
import {
	DEFAULT_GALLERY_HEIGHT,
	DEFAULT_GALLERY_WIDTH,
	galleryItemFromPhoto,
	openGalleryLightbox,
} from '../../lib/gallery/lightbox.ts';
import type { PublicReviewPhoto } from '../../lib/services/review-service.ts';

type ReviewPhotoState = PublicReviewPhoto;

type Props = {
	slug: string;
	photos: ReviewPhotoState[];
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

export default function ReviewGallery({ slug, photos: initialPhotos }: Props) {
	const [photos, setPhotos] = useState(initialPhotos);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [pendingId, setPendingId] = useState<string | null>(null);

	const showError = useCallback((message: string) => {
		setStatusMessage(message);
	}, []);

	const openLightbox = (photoId: string) => {
		const items = photos.map((photo) =>
			galleryItemFromPhoto({
				galleryUrl: photo.galleryUrl,
				width: DEFAULT_GALLERY_WIDTH,
				height: DEFAULT_GALLERY_HEIGHT,
			}),
		);
		const index = photos.findIndex((p) => p.id === photoId);
		if (index >= 0) openGalleryLightbox(items, index);
	};

	const updatePhotoStatus = (photoId: string, selectionStatus: SelectionStatus) => {
		setPhotos((prev) =>
			prev.map((photo) =>
				photo.id === photoId ? { ...photo, selectionStatus } : photo,
			),
		);
	};

	const onToggleSelect = async (photoId: string, current: SelectionStatus) => {
		const next: SelectionStatus = current === 'none' ? 'selected' : 'none';
		setPendingId(photoId);
		try {
			await postSelection(slug, photoId, next);
			updatePhotoStatus(photoId, next);
			setStatusMessage(null);
		} catch (error) {
			showError(error instanceof Error ? error.message : 'Could not save selection');
		} finally {
			setPendingId(null);
		}
	};

	const onToggleApprove = async (photoId: string, current: SelectionStatus) => {
		const next: SelectionStatus = current === 'approved' ? 'selected' : 'approved';
		setPendingId(photoId);
		try {
			await postSelection(slug, photoId, next);
			updatePhotoStatus(photoId, next);
			setStatusMessage(null);
		} catch (error) {
			showError(error instanceof Error ? error.message : 'Could not save approval');
		} finally {
			setPendingId(null);
		}
	};

	return (
		<section
			className="public-wrap"
			style={{ paddingBlock: 'var(--space-4) var(--space-5)' }}
			aria-label="Review gallery"
		>
			{statusMessage ? (
				<p
					className="mb-4 text-center text-sm"
					style={{ color: 'var(--color-accent)' }}
					role="status"
				>
					{statusMessage}
				</p>
			) : null}

			{photos.length === 0 ? (
				<p className="text-center text-sm" style={{ color: 'var(--color-fg-muted)' }}>
					No photos are ready in this collection yet.
				</p>
			) : (
				<ul className="public-masonry-grid columns-2 sm:columns-3 lg:columns-4">
					{photos.map((photo) => {
						const busy = pendingId === photo.id;
						const selected =
							photo.selectionStatus === 'selected' || photo.selectionStatus === 'approved';
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
										width={DEFAULT_GALLERY_WIDTH}
										height={DEFAULT_GALLERY_HEIGHT}
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
										disabled={busy}
										onClick={() => onToggleSelect(photo.id, photo.selectionStatus)}
									>
										{selectButtonLabel(photo.selectionStatus)}
									</button>
									<button
										type="button"
										className="public-action-btn"
										disabled={busy}
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
