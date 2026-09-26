export type AdminReviewCollection = {
	id: string;
	slug: string;
	title: string | null;
	expiresAt: number | null;
	createdAt: number;
};

export async function fetchReviewCollections(): Promise<AdminReviewCollection[]> {
	const res = await fetch('/admin/api/review/collections');
	const json = (await res.json()) as {
		ok?: boolean;
		collections?: AdminReviewCollection[];
		error?: string;
	};
	if (!res.ok || !json.ok || !json.collections) {
		throw new Error(json.error ?? `Load failed (${res.status})`);
	}
	return json.collections;
}

export async function createReviewCollection(input: {
	slug: string;
	title?: string;
	expiresAt?: number;
}): Promise<AdminReviewCollection> {
	const res = await fetch('/admin/api/review/collections', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	});
	const json = (await res.json()) as {
		ok?: boolean;
		collection?: AdminReviewCollection;
		error?: string;
	};
	if (!res.ok || !json.ok || !json.collection) {
		throw new Error(json.error ?? `Create failed (${res.status})`);
	}
	return json.collection;
}

export async function revokeReviewCollection(id: string): Promise<void> {
	const res = await fetch(`/admin/api/review/collections/${encodeURIComponent(id)}`, {
		method: 'DELETE',
	});
	const json = (await res.json()) as { ok?: boolean; error?: string };
	if (!res.ok || !json.ok) {
		throw new Error(json.error ?? `Revoke failed (${res.status})`);
	}
}
