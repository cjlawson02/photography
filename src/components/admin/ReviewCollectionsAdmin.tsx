import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';

const fieldStyle = {
  borderColor: 'var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-fg)',
};

function formatExpires(ms: number | null): string {
  if (ms == null) return '—';
  return new Date(ms).toLocaleString();
}

async function copyText(label: string, text: string, onStatus: (message: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    onStatus(`Copied ${label}.`);
  } catch {
    onStatus(`Could not copy ${label}.`);
  }
}

function ReviewCollectionsAdminInner() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const listQuery = useQuery(trpc.review.collections.list.queryOptions());
  const collections = listQuery.data ?? [];

  const listStatus = listQuery.isPending
    ? 'Loading…'
    : listQuery.isError
      ? listQuery.error instanceof Error
        ? listQuery.error.message
        : String(listQuery.error)
      : collections.length === 0
        ? 'No collections yet.'
        : `${collections.length} collection(s).`;

  const statusMessage = actionStatus !== null ? actionStatus : listStatus;

  const createMutation = useMutation(
    trpc.review.collections.create.mutationOptions({
      onSuccess: async () => {
        setCreateStatus('Created.');
        await queryClient.invalidateQueries(trpc.review.collections.list.queryFilter());
      },
      onError: (error) => {
        setCreateStatus(error instanceof Error ? error.message : String(error));
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
        setActionStatus(error instanceof Error ? error.message : String(error));
      },
    }),
  );

  return (
    <>
      <section className="mt-8">
        <h2
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          New collection
        </h2>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const slugPrefixRaw = String(data.get('slugPrefix') ?? '').trim();
            const titleRaw = String(data.get('title') ?? '').trim();
            const expiresRaw = String(data.get('expiresAt') ?? '').trim();

            const payload: { slugPrefix?: string; title?: string; expiresAt?: number } = {};
            if (slugPrefixRaw) payload.slugPrefix = slugPrefixRaw;
            if (titleRaw) payload.title = titleRaw;
            if (expiresRaw) {
              const ms = new Date(expiresRaw).getTime();
              if (Number.isNaN(ms)) {
                setCreateStatus('Invalid expiry date.');
                return;
              }
              payload.expiresAt = ms;
            }

            setCreateStatus('Creating…');
            try {
              await createMutation.mutateAsync(payload);
              form.reset();
            } catch {
              /* onError sets createStatus */
            }
          }}
        >
          <label className="block text-sm sm:col-span-2" style={{ color: 'var(--color-fg)' }}>
            Slug prefix (optional)
            <input
              type="text"
              name="slugPrefix"
              pattern="[a-zA-Z0-9][a-zA-Z0-9-]*"
              placeholder="smith-wedding"
              className="mt-1 block w-full border px-3 py-2 text-sm"
              style={fieldStyle}
              autoComplete="off"
            />
            <span className="mt-1 block text-xs" style={{ color: 'var(--color-fg-muted)' }}>
              The review URL slug is generated on the server; an optional prefix is added before a
              secret segment.
            </span>
          </label>
          <label className="block text-sm" style={{ color: 'var(--color-fg)' }}>
            Title (optional)
            <input
              type="text"
              name="title"
              className="mt-1 block w-full border px-3 py-2 text-sm"
              style={fieldStyle}
            />
          </label>
          <label className="block text-sm" style={{ color: 'var(--color-fg)' }}>
            Expires (optional)
            <input
              type="datetime-local"
              name="expiresAt"
              className="mt-1 block w-full border px-3 py-2 text-sm"
              style={fieldStyle}
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="px-4 py-2 text-sm"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              disabled={createMutation.isPending}
            >
              Create collection
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs" style={{ color: 'var(--color-fg-muted)' }} aria-live="polite">
          {createStatus}
        </p>
      </section>

      <section className="mt-10">
        <h2
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          Collections
        </h2>
        <p className="mt-2 text-xs" style={{ color: 'var(--color-fg-muted)' }} aria-live="polite">
          {statusMessage}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ color: 'var(--color-fg)' }}>
            <thead>
              <tr
                style={{
                  color: 'var(--color-fg-muted)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <th className="py-2 pr-4 font-normal">Slug</th>
                <th className="py-2 pr-4 font-normal">Title</th>
                <th className="py-2 pr-4 font-normal">Expires</th>
                <th className="py-2 pr-4 font-normal">Link</th>
                <th className="py-2 pr-4 font-normal">Actions</th>
                <th className="py-2 font-normal">Id</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((row) => {
                const reviewPath = `/review/${encodeURIComponent(row.slug)}`;
                const detailPath = `/admin/review/collections/${encodeURIComponent(row.id)}`;
                const absoluteUrl =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}${reviewPath}`
                    : reviewPath;
                const busy = busyId === row.id;

                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="py-2 pr-4">{row.slug}</td>
                    <td className="py-2 pr-4">{row.title ?? '—'}</td>
                    <td className="py-2 pr-4 text-xs">{formatExpires(row.expiresAt)}</td>
                    <td className="py-2 pr-4 text-xs">
                      <a href={reviewPath} style={{ color: 'var(--color-accent)' }}>
                        {reviewPath}
                      </a>
                      <button
                        type="button"
                        className="ml-2 underline"
                        style={{ color: 'var(--color-fg-muted)' }}
                        disabled={busy}
                        onClick={() => {
                          void copyText('client link', absoluteUrl, setActionStatus);
                        }}
                      >
                        Copy
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      <a
                        href={detailPath}
                        className="mr-3"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        Inspect
                      </a>
                      <button
                        type="button"
                        style={{ color: 'var(--color-fg-muted)' }}
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
                    <td
                      className="py-2 font-mono text-xs"
                      style={{ color: 'var(--color-fg-muted)' }}
                    >
                      <span>{row.id}</span>
                      <button
                        type="button"
                        className="ml-2 underline"
                        style={{ color: 'var(--color-fg-muted)' }}
                        disabled={busy}
                        onClick={() => {
                          void copyText('collection id', row.id, setActionStatus);
                        }}
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default function ReviewCollectionsAdmin() {
  return (
    <AdminTrpcProvider>
      <ReviewCollectionsAdminInner />
    </AdminTrpcProvider>
  );
}
