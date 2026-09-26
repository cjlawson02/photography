import type { PortfolioPhotoAdminUpdateBody } from './portfolio-schemas.ts';

export type AdminPortfolioPhoto = {
	id: string;
	status: string;
	published: boolean;
	category: string | null;
	sortOrder: number | null;
	hero: boolean;
	updatedAt: number;
};

export async function fetchPortfolioPhotos(): Promise<AdminPortfolioPhoto[]> {
	const res = await fetch('/admin/api/portfolio/photos');
	const json = (await res.json()) as {
		ok?: boolean;
		photos?: AdminPortfolioPhoto[];
		error?: string;
	};
	if (!res.ok || !json.ok || !json.photos) {
		throw new Error(json.error ?? `Load failed (${res.status})`);
	}
	return json.photos;
}

export async function patchPortfolioPhoto(
	id: string,
	body: PortfolioPhotoAdminUpdateBody,
): Promise<AdminPortfolioPhoto> {
	const res = await fetch(`/admin/api/portfolio/photos/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const json = (await res.json()) as {
		ok?: boolean;
		photo?: AdminPortfolioPhoto;
		error?: string;
	};
	if (!res.ok || !json.ok || !json.photo) {
		throw new Error(json.error ?? `Update failed (${res.status})`);
	}
	return json.photo;
}

export async function deletePortfolioPhoto(id: string): Promise<void> {
	const res = await fetch(`/admin/api/portfolio/photos/${id}`, { method: 'DELETE' });
	const json = (await res.json()) as { ok?: boolean; error?: string };
	if (!res.ok || !json.ok) {
		throw new Error(json.error ?? `Delete failed (${res.status})`);
	}
}
