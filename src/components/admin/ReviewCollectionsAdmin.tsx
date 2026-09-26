import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  reviewCollectionCreateFormSchema,
  type ReviewCollectionCreateFormValues,
} from '../../lib/admin/admin-form-schemas.ts';
import type { z } from 'zod/v4';
import type { AdminReviewCollection } from '../../lib/admin/trpc-types.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import { errorMessage, formatAdminTime } from './admin-format.ts';
import { adminClass } from './admin-styles.ts';
import AdminEmptyState from './AdminEmptyState.tsx';
import AdminFieldLabel from './AdminFieldLabel.tsx';
import AdminPrimaryButton from './AdminPrimaryButton.tsx';
import AdminSectionHeading from './AdminSectionHeading.tsx';
import AdminStatusLine from './AdminStatusLine.tsx';
import { AdminJobStatusBadge } from './AdminJobStepRail.tsx';
import { AdminTable, AdminTableHead, AdminTableHeaderCell, AdminTableRow } from './AdminTable.tsx';

const createCollectionDefaultValues: ReviewCollectionCreateFormValues = {
  slugPrefix: '',
  title: '',
  personName: '',
  expiresAtLocal: '',
  notes: '',
};

async function copyText(label: string, text: string, onStatus: (message: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    onStatus(`Copied ${label}.`);
  } catch {
    onStatus(`Could not copy ${label}.`);
  }
}

type ReviewCollectionsAdminInnerProps = {
  initialCollections?: AdminReviewCollection[];
};

function ReviewCollectionsAdminInner({ initialCollections }: ReviewCollectionsAdminInnerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [initialDataUpdatedAt] = useState(() => Date.now());

  type ReviewCollectionCreatePayload = z.infer<typeof reviewCollectionCreateFormSchema>;

  const createForm = useForm<
    ReviewCollectionCreateFormValues,
    unknown,
    ReviewCollectionCreatePayload
  >({
    resolver: zodResolver(reviewCollectionCreateFormSchema),
    defaultValues: createCollectionDefaultValues,
  });

  const listQuery = useQuery({
    ...trpc.review.collections.list.queryOptions(),
    ...(initialCollections !== undefined
      ? { initialData: initialCollections, initialDataUpdatedAt }
      : {}),
  });
  const collections = listQuery.data ?? [];

  const listStatus = listQuery.isPending
    ? 'Loading…'
    : listQuery.isError
      ? errorMessage(listQuery.error)
      : collections.length === 0
        ? 'No collections yet.'
        : `${collections.length} collection(s).`;

  const statusMessage = actionStatus !== null ? actionStatus : listStatus;

  const showCollectionsEmpty =
    listQuery.isSuccess && !listQuery.isError && collections.length === 0 && actionStatus === null;

  const createMutation = useMutation(
    trpc.review.collections.create.mutationOptions({
      onSuccess: async () => {
        setCreateStatus('Created.');
        createForm.reset(createCollectionDefaultValues);
        await queryClient.invalidateQueries(trpc.review.collections.list.queryFilter());
      },
      onError: (error) => {
        setCreateStatus(errorMessage(error));
      },
    }),
  );

  const revokeMutation = useMutation(
    trpc.review.collections.revoke.mutationOptions({
      onSuccess: async () => {
        setActionStatus('Revoked.');
        await queryClient.invalidateQueries(trpc.review.collections.list.queryFilter());
      },
      onError: (error) => {
        setActionStatus(errorMessage(error));
      },
    }),
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = createForm;

  const firstCreateError =
    errors.slugPrefix?.message ??
    errors.title?.message ??
    errors.personName?.message ??
    errors.expiresAtLocal?.message ??
    errors.notes?.message;

  return (
    <>
      <section className="mt-8">
        <AdminSectionHeading>New shoot</AdminSectionHeading>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={handleSubmit(async (payload) => {
            setCreateStatus('Creating…');
            try {
              await createMutation.mutateAsync(payload);
            } catch {
              /* onError sets createStatus */
            }
          })}
          noValidate
        >
          <AdminFieldLabel label="Slug prefix (optional)" className="block text-sm sm:col-span-2">
            <input
              type="text"
              placeholder="smith-wedding"
              className={`mt-1 block w-full text-sm ${adminClass.field}`}
              autoComplete="off"
              aria-invalid={errors.slugPrefix ? true : undefined}
              {...register('slugPrefix')}
            />
            <span className={`mt-1 block text-xs ${adminClass.fgMuted}`}>
              The review URL slug is generated on the server; an optional prefix is added before a
              secret segment.
            </span>
          </AdminFieldLabel>
          <AdminFieldLabel label="Person name">
            <input
              type="text"
              placeholder="Alex"
              className={`mt-1 block w-full text-sm ${adminClass.field}`}
              aria-invalid={errors.personName ? true : undefined}
              {...register('personName')}
            />
          </AdminFieldLabel>
          <AdminFieldLabel label="Title (optional)">
            <input
              type="text"
              className={`mt-1 block w-full text-sm ${adminClass.field}`}
              aria-invalid={errors.title ? true : undefined}
              {...register('title')}
            />
          </AdminFieldLabel>
          <AdminFieldLabel label="Expires (optional)" className="sm:col-span-2">
            <input
              type="datetime-local"
              className={`mt-1 block w-full text-sm ${adminClass.field}`}
              aria-invalid={errors.expiresAtLocal ? true : undefined}
              {...register('expiresAtLocal')}
            />
          </AdminFieldLabel>
          <AdminFieldLabel label="Notes (optional)" className="sm:col-span-2">
            <textarea
              rows={2}
              className={`mt-1 block w-full text-sm ${adminClass.field}`}
              aria-invalid={errors.notes ? true : undefined}
              {...register('notes')}
            />
          </AdminFieldLabel>
          <div className="sm:col-span-2">
            <AdminPrimaryButton type="submit" disabled={createMutation.isPending}>
              Create shoot
            </AdminPrimaryButton>
          </div>
        </form>
        <AdminStatusLine className="mt-3">{firstCreateError ?? createStatus}</AdminStatusLine>
      </section>

      <section className="mt-10">
        <AdminSectionHeading>Shoots</AdminSectionHeading>
        <AdminStatusLine className="mt-2">{statusMessage}</AdminStatusLine>
        {showCollectionsEmpty ? (
          <AdminEmptyState title="No client shoots yet">
            <p>
              Create a shoot above, then open it for the step rail. Upload proofs on the job page
              and share the client link when you reach <strong>Shared</strong>.
            </p>
          </AdminEmptyState>
        ) : (
          <AdminTable className="mt-3">
            <AdminTableHead>
              <AdminTableHeaderCell>Person</AdminTableHeaderCell>
              <AdminTableHeaderCell>Title</AdminTableHeaderCell>
              <AdminTableHeaderCell>Step</AdminTableHeaderCell>
              <AdminTableHeaderCell>Expires</AdminTableHeaderCell>
              <AdminTableHeaderCell>Link</AdminTableHeaderCell>
              <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
            </AdminTableHead>
            <tbody>
              {collections.map((row) => {
                const reviewPath = `/review/${encodeURIComponent(row.slug)}`;
                const jobPath = `/admin/shoots/${encodeURIComponent(row.id)}`;
                const absoluteUrl =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}${reviewPath}`
                    : reviewPath;
                const busy = busyId === row.id;

                return (
                  <AdminTableRow key={row.id}>
                    <td className="py-2 pr-4">{row.personName ?? '—'}</td>
                    <td className="py-2 pr-4">{row.title ?? row.slug}</td>
                    <td className="py-2 pr-4">
                      <AdminJobStatusBadge status={row.status} />
                    </td>
                    <td className="py-2 pr-4 text-xs">{formatAdminTime(row.expiresAt)}</td>
                    <td className="py-2 pr-4 text-xs">
                      <a href={reviewPath} className={adminClass.link}>
                        {reviewPath}
                      </a>
                      <button
                        type="button"
                        className={`ml-2 ${adminClass.linkMuted}`}
                        disabled={busy}
                        onClick={() => {
                          void copyText('client link', absoluteUrl, setActionStatus);
                        }}
                      >
                        Copy
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      <a href={jobPath} className={`mr-3 ${adminClass.link}`}>
                        Open job
                      </a>
                      <a href={`${jobPath}#upload`} className={`mr-3 ${adminClass.link}`}>
                        Upload
                      </a>
                      <button
                        type="button"
                        className={adminClass.linkMuted}
                        disabled={busy || revokeMutation.isPending}
                        onClick={() => {
                          if (
                            !confirm(
                              'Revoke this review link? Clients will lose access; R2 objects are deleted.',
                            )
                          ) {
                            return;
                          }
                          setBusyId(row.id);
                          void (async () => {
                            try {
                              await revokeMutation.mutateAsync({ id: row.id });
                            } catch {
                              /* onError sets actionStatus */
                            } finally {
                              setBusyId(null);
                            }
                          })();
                        }}
                      >
                        Revoke
                      </button>
                    </td>
                  </AdminTableRow>
                );
              })}
            </tbody>
          </AdminTable>
        )}
      </section>
    </>
  );
}

type ReviewCollectionsAdminProps = {
  initialCollections?: AdminReviewCollection[];
};

export default function ReviewCollectionsAdmin({
  initialCollections,
}: ReviewCollectionsAdminProps) {
  return (
    <AdminTrpcProvider>
      <ReviewCollectionsAdminInner initialCollections={initialCollections} />
    </AdminTrpcProvider>
  );
}
