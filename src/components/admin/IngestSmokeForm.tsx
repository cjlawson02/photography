import { useCallback, useEffect, useState } from 'react';

import {
  fetchReviewCollections,
  type AdminReviewCollection,
} from '../../lib/admin/review-collections-api.ts';
import { uploadPhoto } from '../../lib/ingest/browser-upload.ts';

const fieldStyle = {
  borderColor: 'var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-fg)',
};

type Bucket = 'portfolio' | 'review';

export default function IngestSmokeForm() {
  const [bucket, setBucket] = useState<Bucket>('portfolio');
  const [collections, setCollections] = useState<AdminReviewCollection[]>([]);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [collectionId, setCollectionId] = useState('');
  const [statusText, setStatusText] = useState('Ready.');
  const [busy, setBusy] = useState(false);

  const loadCollections = useCallback(async () => {
    setCollectionsError(null);
    try {
      const rows = await fetchReviewCollections();
      setCollections(rows);
      setCollectionId((prev) => {
        if (prev && rows.some((row) => row.id === prev)) return prev;
        return rows[0]?.id ?? '';
      });
    } catch (error) {
      setCollections([]);
      setCollectionId('');
      setCollectionsError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const collectionOptions =
    collections.length === 0
      ? collectionsError
        ? [{ value: '', label: 'Could not load collections' }]
        : [{ value: '', label: 'No collections yet' }]
      : collections.map((row) => ({
          value: row.id,
          label: row.title ? `${row.title} (${row.slug})` : row.slug,
        }));

  return (
    <form
      className="space-y-4"
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
        setStatusText('Uploading…');
        try {
          const result =
            bucket === 'review'
              ? await uploadPhoto({ file, bucket, collectionId })
              : await uploadPhoto({ file, bucket });
          setStatusText(JSON.stringify(result, null, 2));
          form.reset();
        } catch (error) {
          setStatusText(error instanceof Error ? error.message : String(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-sm" style={{ color: 'var(--color-fg)' }}>
        Bucket
        <select
          name="bucket"
          className="mt-1 block w-full border px-3 py-2"
          style={fieldStyle}
          value={bucket}
          disabled={busy}
          onChange={(event) => {
            setBucket(event.target.value as Bucket);
          }}
        >
          <option value="portfolio">portfolio (PORTFOLIO)</option>
          <option value="review">review (REVIEW)</option>
        </select>
      </label>

      {bucket === 'review' ? (
        <label className="block text-sm" style={{ color: 'var(--color-fg)' }}>
          Review collection
          <select
            name="collectionId"
            className="mt-1 block w-full border px-3 py-2 text-sm"
            style={fieldStyle}
            value={collectionId}
            disabled={busy || collections.length === 0}
            onChange={(event) => setCollectionId(event.target.value)}
          >
            {collectionOptions.map((option) => (
              <option key={option.value || option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-fg-muted)' }}>
            <a href="/admin/review" style={{ color: 'var(--color-accent)' }}>
              Create a collection
            </a>{' '}
            if none appear.
          </p>
        </label>
      ) : null}

      <label className="block text-sm" style={{ color: 'var(--color-fg)' }}>
        Photo
        <input
          type="file"
          name="file"
          accept="image/*"
          required
          disabled={busy}
          className="mt-1 block w-full text-sm"
          style={{ color: 'var(--color-fg)' }}
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="px-4 py-2 text-sm disabled:opacity-60"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
      >
        {busy ? 'Uploading…' : 'Upload'}
      </button>

      <pre
        className="mt-6 overflow-x-auto p-3 text-xs"
        style={{
          background: 'color-mix(in oklab, var(--color-fg) 6%, transparent)',
          color: 'var(--color-fg-muted)',
        }}
        aria-live="polite"
      >
        {statusText}
      </pre>
    </form>
  );
}
