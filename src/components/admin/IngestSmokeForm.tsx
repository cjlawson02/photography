import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { uploadPhoto, type UploadProgress } from '../../lib/ingest/browser-upload.ts';
import { AdminTrpcProvider, useTRPC } from '../../lib/trpc/react.tsx';
import AdminEmptyState from './AdminEmptyState.tsx';
import AdminFieldLabel from './AdminFieldLabel.tsx';
import AdminPrimaryButton from './AdminPrimaryButton.tsx';
import {
  adminAccentStyle,
  adminCodePanelStyle,
  adminFieldStyle,
  adminFgMutedStyle,
  adminFgStyle,
} from './admin-styles.ts';
import { errorMessage } from './admin-format.ts';

type Bucket = 'portfolio' | 'review';

function IngestSmokeFormInner() {
  const trpc = useTRPC();
  const collectionsQuery = useQuery(trpc.review.collections.list.queryOptions());
  const collections = collectionsQuery.data ?? [];

  const collectionsError = collectionsQuery.isError ? errorMessage(collectionsQuery.error) : null;

  const [bucket, setBucket] = useState<Bucket>('portfolio');
  const [collectionId, setCollectionId] = useState('');
  const [statusText, setStatusText] = useState('Ready.');
  const [putPercent, setPutPercent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const rows = collectionsQuery.data;
    if (!collectionsQuery.isSuccess || !rows) return;
    setCollectionId((prev) => {
      if (prev && rows.some((row) => row.id === prev)) return prev;
      return rows[0]?.id ?? '';
    });
  }, [collectionsQuery.isSuccess, collectionsQuery.data]);

  const collectionOptions = collectionsQuery.isPending
    ? [{ value: '', label: 'Loading collections…' }]
    : collections.length === 0
      ? collectionsError
        ? [{ value: '', label: 'Could not load collections' }]
        : [{ value: '', label: 'No collections yet' }]
      : collections.map((row) => ({
          value: row.id,
          label: row.title ? `${row.title} (${row.slug})` : row.slug,
        }));

  return (
    <>
      <AdminEmptyState title="How upload works" align="start">
        <p>
          Pick an image file and submit. The browser PUTs to R2 using a presigned URL, then the
          Worker runs compress-once and writes variants.
        </p>
        <p className="mt-2">
          <strong>Portfolio</strong> uploads land in{' '}
          <a href="/admin/portfolio" style={adminAccentStyle}>
            Portfolio
          </a>{' '}
          — publish ready rows for the public site. <strong>Review</strong> uploads require a
          collection from{' '}
          <a href="/admin/review" style={adminAccentStyle}>
            Review
          </a>{' '}
          first; clients proof on the share link.
        </p>
        <p className="mt-2">
          Failed or stuck ingest? Reprocess from{' '}
          <a href="/admin/portfolio" style={adminAccentStyle}>
            Portfolio
          </a>{' '}
          or the collection detail page.
        </p>
      </AdminEmptyState>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const file = data.get('file');
          if (!(file instanceof File) || file.size === 0) {
            setStatusText('Choose an image file.');
            return;
          }
          if (bucket === 'review' && !collectionId) {
            setStatusText('Pick a review collection (or create one under Review).');
            return;
          }

          setBusy(true);
          setPutPercent(null);
          setStatusText('Requesting upload URL…');
          const onProgress = (progress: UploadProgress) => {
            setPutPercent(progress.percent);
            setStatusText(
              progress.percent === null
                ? 'Uploading to R2…'
                : `Uploading to R2… ${progress.percent}%`,
            );
          };
          try {
            const result =
              bucket === 'review'
                ? await uploadPhoto({ file, bucket, collectionId, onProgress })
                : await uploadPhoto({ file, bucket, onProgress });
            setPutPercent(null);
            setStatusText(JSON.stringify(result, null, 2));
            form.reset();
          } catch (error) {
            setPutPercent(null);
            setStatusText(errorMessage(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <AdminFieldLabel label="Bucket">
          <select
            name="bucket"
            className="mt-1 block w-full border px-3 py-2"
            style={adminFieldStyle}
            value={bucket}
            disabled={busy}
            onChange={(event) => {
              setBucket(event.target.value as Bucket);
            }}
          >
            <option value="portfolio">portfolio (PORTFOLIO)</option>
            <option value="review">review (REVIEW)</option>
          </select>
        </AdminFieldLabel>

        {bucket === 'review' ? (
          <AdminFieldLabel label="Review collection">
            <select
              name="collectionId"
              className="mt-1 block w-full border px-3 py-2 text-sm"
              style={adminFieldStyle}
              value={collectionId}
              disabled={busy || collectionsQuery.isPending || collections.length === 0}
              onChange={(event) => setCollectionId(event.target.value)}
            >
              {collectionOptions.map((option) => (
                <option key={option.value || option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs" style={adminFgMutedStyle}>
              <a href="/admin/review" style={adminAccentStyle}>
                Create a collection
              </a>{' '}
              if none appear.
            </p>
          </AdminFieldLabel>
        ) : null}

        <AdminFieldLabel label="Photo">
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            disabled={busy}
            className="mt-1 block w-full text-sm"
            style={adminFgStyle}
          />
        </AdminFieldLabel>

        <AdminPrimaryButton type="submit" disabled={busy}>
          {busy ? 'Uploading…' : 'Upload'}
        </AdminPrimaryButton>

        {busy && putPercent !== null ? (
          <div className="space-y-1">
            <progress
              className="block h-2 w-full"
              max={100}
              value={putPercent}
              aria-label="Upload progress"
            />
            <p className="text-xs tabular-nums" style={adminFgMutedStyle}>
              {putPercent}%
            </p>
          </div>
        ) : null}

        <pre
          className="mt-6 overflow-x-auto p-3 text-xs"
          style={adminCodePanelStyle}
          aria-live="polite"
        >
          {statusText}
        </pre>
      </form>
    </>
  );
}

export default function IngestSmokeForm() {
  return (
    <AdminTrpcProvider>
      <IngestSmokeFormInner />
    </AdminTrpcProvider>
  );
}
