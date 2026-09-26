import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { PortfolioPhotoAdminUpdateBody } from '../../lib/admin/portfolio-schemas.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import { requestReprocess } from '../../lib/ingest/browser-upload.ts';
import PortfolioRow from './PortfolioRow.tsx';

function addBusyId(set: Set<string>, id: string): Set<string> {
	const next = new Set(set);
	next.add(id);
	return next;
}

function removeBusyId(set: Set<string>, id: string): Set<string> {
	const next = new Set(set);
	next.delete(id);
	return next;
}

function PortfolioAdminTableInner() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [statusMessage, setStatusMessage] = useState('Loading…');
	const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());

	const listQuery = useQuery(trpc.portfolio.list.queryOptions());

	const photos = listQuery.data ?? [];

	useEffect(() => {
		if (listQuery.isPending) {
			setStatusMessage('Loading…');
			return;
		}
		if (listQuery.isError) {
			setStatusMessage(
				listQuery.error instanceof Error
					? listQuery.error.message
					: String(listQuery.error),
			);
			return;
		}
		const rows = listQuery.data ?? [];
		setStatusMessage(
			rows.length === 0
				? 'No portfolio photos yet — upload via Upload.'
				: `${rows.length} photo(s).`,
		);
	}, [listQuery.isPending, listQuery.isError, listQuery.error, listQuery.data]);

	const updateMutation = useMutation(
		trpc.portfolio.update.mutationOptions({
			onSuccess: (updated) => {
				queryClient.setQueryData(trpc.portfolio.list.queryKey(), (current) =>
					current?.map((row) => (row.id === updated.id ? updated : row)),
				);
				setStatusMessage('Saved.');
			},
		}),
	);

	const deleteMutation = useMutation(
		trpc.portfolio.delete.mutationOptions({
			onSuccess: (_result, variables) => {
				queryClient.setQueryData(trpc.portfolio.list.queryKey(), (current) =>
					current?.filter((row) => row.id !== variables.id),
				);
				setStatusMessage('Deleted.');
			},
		}),
	);

	const runForPhoto = async (
		photoId: string,
		statusLabel: string,
		action: () => Promise<void>,
	) => {
		setBusyIds((prev) => addBusyId(prev, photoId));
		setStatusMessage(statusLabel);
		try {
			await action();
		} catch (error) {
			setStatusMessage(error instanceof Error ? error.message : String(error));
			throw error;
		} finally {
			setBusyIds((prev) => removeBusyId(prev, photoId));
		}
	};

	const onPatch = async (
		photoId: string,
		body: PortfolioPhotoAdminUpdateBody,
		statusLabel: string,
	) => {
		await runForPhoto(photoId, statusLabel, async () => {
			await updateMutation.mutateAsync({ id: photoId, data: body });
		});
	};

	const onDelete = async (photoId: string) => {
		await runForPhoto(photoId, 'Deleting…', async () => {
			await deleteMutation.mutateAsync({ id: photoId });
		});
	};

	const onReprocess = async (photoId: string) => {
		await runForPhoto(photoId, 'Reprocessing from original…', async () => {
			await requestReprocess({ id: photoId, bucket: 'portfolio' });
			setStatusMessage('Reprocess complete.');
			await queryClient.invalidateQueries(trpc.portfolio.list.queryFilter());
		});
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
						<tr
							style={{
								color: 'var(--color-fg-muted)',
								borderBottom: '1px solid var(--color-border)',
							}}
						>
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
						{photos.map((photo) => (
							<PortfolioRow
								key={photo.id}
								photo={photo}
								busy={busyIds.has(photo.id)}
								onPatch={onPatch}
								onDelete={onDelete}
								onReprocess={onReprocess}
							/>
						))}
					</tbody>
				</table>
			</div>
		</>
	);
}

export default function PortfolioAdminTable() {
	return (
		<AdminTrpcProvider>
			<PortfolioAdminTableInner />
		</AdminTrpcProvider>
	);
}
