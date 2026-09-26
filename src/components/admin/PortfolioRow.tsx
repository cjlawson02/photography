import { useState } from 'react';

import type { PortfolioPhotoAdminUpdateBody } from '../../lib/admin/portfolio-schemas.ts';
import type { AdminPortfolioPhoto } from '../../lib/admin/trpc-types.ts';
import { portfolioVariantPublicUrl } from '../../lib/media/portfolio-public-url.ts';
import { isPortfolioCategory, PORTFOLIO_CATEGORIES } from '../../lib/portfolio/categories.ts';

const borderStyle = { borderColor: 'var(--color-border)' };
const fieldStyle = {
  borderColor: 'var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-fg)',
};

function formatSortValue(sortOrder: number | null | undefined): string {
  return sortOrder == null ? '' : String(sortOrder);
}

function formatTime(ms: number | null | undefined): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString();
}

function formatDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
): string {
  if (width == null || height == null) return '—';
  return `${width}×${height}`;
}

type Props = {
  photo: AdminPortfolioPhoto;
  busy: boolean;
  onPatch: (
    photoId: string,
    body: PortfolioPhotoAdminUpdateBody,
    statusLabel: string,
  ) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  onReprocess: (photoId: string) => Promise<void>;
};

export default function PortfolioRow({ photo, busy, onPatch, onDelete, onReprocess }: Props) {
  const [sortDraft, setSortDraft] = useState(() => formatSortValue(photo.sortOrder));
  const [syncedSortOrder, setSyncedSortOrder] = useState(photo.sortOrder);

  if (photo.sortOrder !== syncedSortOrder) {
    setSyncedSortOrder(photo.sortOrder);
    setSortDraft(formatSortValue(photo.sortOrder));
  }

  const thumbUrl =
    photo.status === 'ready'
      ? portfolioVariantPublicUrl(photo.id, 'thumb.webp', photo.updatedAt)
      : null;
  const canPublish = photo.status === 'ready';
  const canReprocess = photo.status === 'failed' || photo.status === 'pending';

  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
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
      <td
        className="py-3 pr-4 align-middle text-xs tabular-nums"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        {formatDimensions(photo.width, photo.height)}
      </td>
      <td className="py-3 pr-4 align-middle">
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            aria-label="Published"
            checked={photo.published}
            disabled={!canPublish || busy}
            title={canPublish ? undefined : 'Ingest must be ready'}
            onChange={(event) => {
              const published = event.target.checked;
              void onPatch(photo.id, { published }, 'Saving publish…').catch(() => undefined);
            }}
          />
          <span>{photo.published ? 'Yes' : 'No'}</span>
        </label>
      </td>
      <td className="py-3 pr-4 align-middle">
        <select
          className="border px-2 py-1 text-xs"
          style={fieldStyle}
          aria-label="Category"
          value={photo.category ?? ''}
          disabled={busy}
          onChange={(event) => {
            const value = event.target.value;
            const category = value === '' ? null : isPortfolioCategory(value) ? value : null;
            void onPatch(photo.id, { category }, 'Saving category…').catch(() => undefined);
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
          aria-label="Sort order"
          value={sortDraft}
          placeholder="—"
          disabled={busy}
          onChange={(event) => setSortDraft(event.target.value)}
          onBlur={() => {
            const raw = sortDraft.trim();
            const parsed = raw === '' ? null : Number.parseInt(raw, 10);
            if (raw !== '' && Number.isNaN(parsed)) {
              setSortDraft(formatSortValue(photo.sortOrder));
              return;
            }
            if (parsed === photo.sortOrder) return;
            void onPatch(photo.id, { sortOrder: parsed }, 'Saving sort…').catch(() => undefined);
          }}
        />
      </td>
      <td className="py-3 pr-4 align-middle">
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            aria-label="Hero image"
            checked={photo.hero}
            disabled={busy}
            onChange={(event) => {
              const hero = event.target.checked;
              void onPatch(photo.id, { hero }, 'Saving hero…').catch(() => undefined);
            }}
          />
          <span>{photo.hero ? 'Yes' : 'No'}</span>
        </label>
      </td>
      <td className="py-3 pr-4 align-middle text-xs" style={{ color: 'var(--color-fg-muted)' }}>
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
                void onReprocess(photo.id);
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
              void onDelete(photo.id);
            }}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
