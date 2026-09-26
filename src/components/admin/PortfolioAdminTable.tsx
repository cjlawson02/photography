import { useCallback, useEffect, useState } from 'react';

import {
	deletePortfolioPhoto,
	fetchPortfolioPhotos,
	patchPortfolioPhoto,
	type AdminPortfolioPhoto,
} from '../../lib/admin/portfolio-api.ts';
import { requestReprocess } from '../../lib/ingest/browser-upload.ts';
import {
	isPortfolioCategory,
	PORTFOLIO_CATEGORIES,
} from '../../lib/portfolio/categories.ts';

function formatTime(ms: number | null | undefined): string {
	if (!ms) return '—';
	return new Date(ms).toLocaleString();
}

const borderStyle = { borderColor: 'var(--color-border)' };
const fieldStyle = {
	borderColor: 'var(--color-border)',
	background: 'var(--color-bg)',
	color: 'var(--color-fg)',
};

export default function PortfolioAdminTable() {
	const [photos, setPhotos] = useState<AdminPortfolioPhoto[]>([]);
	const [statusMessage, setStatusMessage] = useState('Loading…');
	const [busyId, setBusyId] = useState<string | null>(null);

	const reload = useCallback(async () => {
		setStatusMessage('Loading…');
		try {
			const rows = await fetchPortfolioPhotos();
			setPhotos(rows);
			setStatusMessage(
				rows.length === 0
					? 'No portfolio photos yet — upload via Upload.'
					: `${rows.length} photo(s).`,
			);
		} catch (error) {
			setStatusMessage(error instanceof Error ? error.message : String(error));
			setPhotos([]);
		}
	}, []);

	useEffect(() => {
		void reload();
	}, [reload]);

	const runForPhoto = async (photoId: string, label: string, action: () => Promise<void>) => {
		setBusyId(photoId);
		setStatusMessage(label);
		try {
			await action();
		} catch (error) {
			setStatusMessage(error instanceof Error ? error.message : String(error));
			throw error;
		} finally {
			setBusyId(null);
		}
	};

	const updatePhotoInState = (updated: AdminPortfolioPhoto) => {
		setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
	};

	return (
		<>
			<p
				className="mt-4 text-xs"
				style={{ color: 'var(--color-fg-muted)' }}
				aria-live="polite"
			>
				{statusMessage}
			</p>

			<div className="mt-6 overflow-x-auto">
				<table className="w-full text-left text-sm" style={{ color: 'var(--color-fg)' }}>
					<thead>
						<tr style={{ color: 'var(--color-fg-muted)', borderBottom: '1px solid var(--color-border)' }}>
							<th className="py-2 pr-4 font-normal">Preview</th>
							<th className="py-2 pr-4 font-normal">Ingest</th>
							<th className="py-2 pr-4 font-normal">Published</th>
							<th className="py-2 pr-4 font-normal">Category</th>
							<th className="py-2 pr-4 font-normal">Sort</th>
							<th className="py-2 pr-4 font-normal">Hero</th>
							<th className="py-2 pr-4 font-normal">Updated</th>
							<th className="py-2 font-normal">Actions</th>
						</tr>
					</thead>
					<tbody>
						{photos.map((photo) => {
							const busy = busyId === photo.id;
							const thumbUrl =
								photo.status === 'ready'
									? `/media/portfolio/${photo.id}/thumb.webp`
									: null;
							const canPublish = photo.status === 'ready';
							const canReprocess =
								photo.status === 'failed' || photo.status === 'pending';

							return (
								<tr
									key={photo.id}
									style={{ borderBottom: '1px solid var(--color-border)' }}
								>
									<td className="py-3 pr-4 align-middle">
										{thumbUrl ? (
											<img
												src={thumbUrl}
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
										) : (
											<span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
												—
											</span>
										)}
									</td>
									<td className="py-3 pr-4 align-middle">
										<code className="text-xs">{photo.status}</code>
									</td>
									<td className="py-3 pr-4 align-middle">
										<label className="inline-flex items-center gap-2 text-xs">
											<input
												type="checkbox"
												checked={photo.published}
												disabled={!canPublish || busy}
												title={canPublish ? undefined : 'Ingest must be ready'}
												onChange={async (event) => {
													const published = event.target.checked;
													try {
														await runForPhoto(photo.id, 'Saving publish…', async () => {
															const updated = await patchPortfolioPhoto(photo.id, {
																published,
															});
															updatePhotoInState(updated);
															setStatusMessage('Saved.');
														});
													} catch {
														/* status set in runForPhoto */
													}
												}}
											/>
											<span>{photo.published ? 'Yes' : 'No'}</span>
										</label>
									</td>
									<td className="py-3 pr-4 align-middle">
										<select
											className="border px-2 py-1 text-xs"
											style={fieldStyle}
											value={photo.category ?? ''}
											disabled={busy}
											onChange={async (event) => {
												const value = event.target.value;
												try {
													await runForPhoto(photo.id, 'Saving category…', async () => {
														const category =
															value === ''
																? null
																: isPortfolioCategory(value)
																	? value
																	: null;
														const updated = await patchPortfolioPhoto(photo.id, {
															category,
														});
														updatePhotoInState(updated);
														setStatusMessage('Saved.');
													});
												} catch {
													/* status set */
												}
											}}
										>
											<option value="">—</option>
											{PORTFOLIO_CATEGORIES.map((category) => (
												<option key={category} value={category}>
													{category}
												</option>
											))}
										</select>
									</td>
									<td className="py-3 pr-4 align-middle">
										<input
											type="number"
											className="w-20 border px-2 py-1 text-xs"
											style={fieldStyle}
											value={photo.sortOrder ?? ''}
											placeholder="—"
											disabled={busy}
											onChange={(event) => {
												const raw = event.target.value;
												setPhotos((prev) =>
													prev.map((p) =>
														p.id === photo.id
															? {
																	...p,
																	sortOrder:
																		raw === ''
																			? null
																			: Number.parseInt(raw, 10),
																}
															: p,
													),
												);
											}}
											onBlur={async (event) => {
												const raw = event.target.value.trim();
												const sortOrder =
													raw === '' ? null : Number.parseInt(raw, 10);
												if (raw !== '' && Number.isNaN(sortOrder)) {
													setStatusMessage('Sort must be a number.');
													return;
												}
												try {
													await runForPhoto(photo.id, 'Saving sort…', async () => {
														const updated = await patchPortfolioPhoto(photo.id, {
															sortOrder,
														});
														updatePhotoInState(updated);
														setStatusMessage('Saved.');
													});
												} catch {
													void reload();
												}
											}}
										/>
									</td>
									<td className="py-3 pr-4 align-middle">
										<label className="inline-flex items-center gap-2 text-xs">
											<input
												type="checkbox"
												checked={photo.hero}
												disabled={busy}
												onChange={async (event) => {
													const hero = event.target.checked;
													try {
														await runForPhoto(photo.id, 'Saving hero…', async () => {
															const updated = await patchPortfolioPhoto(photo.id, {
																hero,
															});
															updatePhotoInState(updated);
															setStatusMessage('Saved.');
														});
													} catch {
														/* status set */
													}
												}}
											/>
											<span>{photo.hero ? 'Yes' : 'No'}</span>
										</label>
									</td>
									<td
										className="py-3 pr-4 align-middle text-xs"
										style={{ color: 'var(--color-fg-muted)' }}
									>
										{formatTime(photo.updatedAt)}
									</td>
									<td className="py-3 align-middle">
										<div className="flex flex-wrap gap-2">
											{canReprocess ? (
												<button
													type="button"
													className="text-xs underline"
													style={{ color: 'var(--color-fg)' }}
													disabled={busy}
													onClick={() => {
														void runForPhoto(
															photo.id,
															'Reprocessing from original…',
															async () => {
																await requestReprocess({
																	id: photo.id,
																	bucket: 'portfolio',
																});
																setStatusMessage('Reprocess complete.');
																await reload();
															},
														);
													}}
												>
													Reprocess
												</button>
											) : null}
											<button
												type="button"
												className="text-xs underline"
												style={{ color: 'var(--color-accent)' }}
												disabled={busy}
												onClick={() => {
													if (!confirm(`Delete portfolio photo ${photo.id}?`)) return;
													void runForPhoto(photo.id, 'Deleting…', async () => {
														await deletePortfolioPhoto(photo.id);
														setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
														setStatusMessage('Deleted.');
													});
												}}
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</>
	);
}
