import { initGalleryLightbox } from './gallery-lightbox.ts';

type SelectionStatus = 'none' | 'selected' | 'approved';

function setSelectionButtonState(button: HTMLButtonElement, status: SelectionStatus) {
	button.dataset.selectionStatus = status;
	const selected = status === 'selected' || status === 'approved';
	button.setAttribute('aria-pressed', selected ? 'true' : 'false');
	button.textContent = status === 'approved' ? 'Approved' : selected ? 'Selected' : 'Select';
}

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

export function initReviewGallery(root: HTMLElement, slug: string): void {
	initGalleryLightbox(root);

	root.querySelectorAll('[data-review-select]').forEach((button) => {
		if (!(button instanceof HTMLButtonElement)) return;
		const item = button.closest('[data-gallery-item]');
		if (!(item instanceof HTMLElement)) return;
		const photoId = item.dataset.photoId?.trim();
		if (!photoId) return;

		button.addEventListener('click', async () => {
			const current = (button.dataset.selectionStatus as SelectionStatus | undefined) ?? 'none';
			const next: SelectionStatus = current === 'none' ? 'selected' : 'none';
			button.disabled = true;
			try {
				await postSelection(slug, photoId, next);
				setSelectionButtonState(button, next);
				item.dataset.selectionStatus = next;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Could not save selection';
				root.dispatchEvent(
					new CustomEvent('review-selection-error', { detail: { message }, bubbles: true }),
				);
			} finally {
				button.disabled = false;
			}
		});
	});

	root.querySelectorAll('[data-review-approve]').forEach((button) => {
		if (!(button instanceof HTMLButtonElement)) return;
		const item = button.closest('[data-gallery-item]');
		if (!(item instanceof HTMLElement)) return;
		const photoId = item.dataset.photoId?.trim();
		if (!photoId) return;

		button.addEventListener('click', async () => {
			const current = (item.dataset.selectionStatus as SelectionStatus | undefined) ?? 'none';
			const next: SelectionStatus = current === 'approved' ? 'selected' : 'approved';
			button.disabled = true;
			try {
				await postSelection(slug, photoId, next);
				const selectButton = item.querySelector('[data-review-select]');
				if (selectButton instanceof HTMLButtonElement) {
					setSelectionButtonState(selectButton, next);
				}
				item.dataset.selectionStatus = next;
				button.textContent = next === 'approved' ? 'Unapprove' : 'Approve';
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Could not save approval';
				root.dispatchEvent(
					new CustomEvent('review-selection-error', { detail: { message }, bubbles: true }),
				);
			} finally {
				button.disabled = false;
			}
		});
	});
}
