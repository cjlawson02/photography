import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import {
  portfolioPhotoAdminRowFormSchema,
  portfolioRowFormValuesFromPhoto,
  portfolioRowPatchFromField,
  type PortfolioPhotoAdminRowFormValues,
} from '../../lib/admin/admin-form-schemas.ts';
import type { PortfolioPhotoAdminUpdateBody } from '../../lib/admin/portfolio-schemas.ts';
import type { AdminPortfolioPhoto } from '../../lib/admin/trpc-types.ts';
import { isStalePendingIngest } from '../../lib/ingest/stale-pending.ts';
import { THUMB_VARIANT } from '../../lib/ingest/keys.ts';
import { portfolioVariantPublicUrl } from '../../lib/media/variant-media-url.ts';
import { PORTFOLIO_CATEGORIES } from '../../lib/portfolio/categories.ts';
import { formatAdminDimensions, formatAdminTime, normalizeNullableText } from './admin-format.ts';
import { adminClass } from './admin-styles.ts';

function fieldChanged(
  field: keyof PortfolioPhotoAdminRowFormValues,
  photo: AdminPortfolioPhoto,
  values: PortfolioPhotoAdminRowFormValues,
): boolean {
  switch (field) {
    case 'published':
      return values.published !== photo.published;
    case 'alt':
      return normalizeNullableText(values.alt) !== normalizeNullableText(photo.alt);
    case 'title':
      return normalizeNullableText(values.title) !== normalizeNullableText(photo.title);
    case 'caption':
      return normalizeNullableText(values.caption) !== normalizeNullableText(photo.caption);
    case 'category':
      return (values.category === '' ? null : values.category) !== photo.category;
    case 'sortOrder': {
      const trimmed = values.sortOrder.trim();
      const parsed = trimmed === '' ? null : Number.parseInt(trimmed, 10);
      if (trimmed !== '' && Number.isNaN(parsed)) return true;
      return parsed !== photo.sortOrder;
    }
    case 'hero':
      return values.hero !== photo.hero;
    default:
      return false;
  }
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
  const form = useForm({
    resolver: zodResolver(portfolioPhotoAdminRowFormSchema),
    values: portfolioRowFormValuesFromPhoto(photo),
  });

  const { register, control, getValues, trigger, reset } = form;

  const saveField = async (field: keyof PortfolioPhotoAdminRowFormValues, statusLabel: string) => {
    const valid = await trigger(field);
    if (!valid) {
      reset(portfolioRowFormValuesFromPhoto(photo));
      return;
    }
    const values = getValues();
    if (!fieldChanged(field, photo, values)) return;
    try {
      const patch = portfolioRowPatchFromField(field, values) as PortfolioPhotoAdminUpdateBody;
      await onPatch(photo.id, patch, statusLabel);
    } catch {
      reset(portfolioRowFormValuesFromPhoto(photo));
    }
  };

  const savePatch = async (patch: PortfolioPhotoAdminUpdateBody, statusLabel: string) => {
    await onPatch(photo.id, patch, statusLabel).catch(() => undefined);
  };

  const thumbUrl =
    photo.status === 'ready'
      ? portfolioVariantPublicUrl(photo.id, THUMB_VARIANT.suffix, photo.updatedAt)
      : null;
  const canPublish = photo.status === 'ready';
  const canReprocess = photo.status === 'failed' || photo.status === 'pending';
  const stalePending = photo.status === 'pending' && isStalePendingIngest(photo.createdAt);

  const textFieldClass = `min-w-[8rem] ${adminClass.fieldSm}`;

  return (
    <tr className={adminClass.tableRow}>
      <td className="py-3 pr-4 align-middle">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" width={72} height={54} className={adminClass.thumb} />
        ) : (
          <span className={`text-xs ${adminClass.fgMuted}`}>—</span>
        )}
      </td>
      <td className="py-3 pr-4 align-middle">
        <code className="text-xs">{photo.status}</code>
        {stalePending ? (
          <span
            className={`ml-2 text-xs ${adminClass.accent}`}
            title="Pending longer than presign TTL + grace — safe to delete or run cleanup"
          >
            stale
          </span>
        ) : null}
      </td>
      <td className={`py-3 pr-4 align-middle text-xs tabular-nums ${adminClass.fgMuted}`}>
        {formatAdminDimensions(photo.width, photo.height)}
      </td>
      <td className="py-3 pr-4 align-middle">
        <Controller
          name="published"
          control={control}
          render={({ field }) => (
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                aria-label="Published"
                checked={field.value}
                disabled={!canPublish || busy}
                title={canPublish ? undefined : 'Ingest must be ready'}
                onChange={(event) => {
                  const published = event.target.checked;
                  field.onChange(published);
                  if (published === photo.published) return;
                  void savePatch({ published }, 'Saving publish…');
                }}
              />
              <span>{field.value ? 'Yes' : 'No'}</span>
            </label>
          )}
        />
      </td>
      <td className="py-3 pr-4 align-middle">
        <input
          type="text"
          className={`${textFieldClass} min-w-[8rem]`}
          aria-label="Alt text"
          placeholder="—"
          disabled={busy}
          {...register('alt', {
            onBlur: () => {
              void saveField('alt', 'Saving alt…');
            },
          })}
        />
      </td>
      <td className="py-3 pr-4 align-middle">
        <input
          type="text"
          className={`${textFieldClass} min-w-[6rem]`}
          aria-label="Title"
          placeholder="—"
          disabled={busy}
          {...register('title', {
            onBlur: () => {
              void saveField('title', 'Saving title…');
            },
          })}
        />
      </td>
      <td className="py-3 pr-4 align-middle">
        <input
          type="text"
          className={`${textFieldClass} min-w-[8rem]`}
          aria-label="Caption"
          placeholder="—"
          disabled={busy}
          {...register('caption', {
            onBlur: () => {
              void saveField('caption', 'Saving caption…');
            },
          })}
        />
      </td>
      <td className="py-3 pr-4 align-middle">
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <select
              className={textFieldClass}
              aria-label="Category"
              value={field.value}
              disabled={busy}
              onChange={(event) => {
                const value = event.target.value as PortfolioPhotoAdminRowFormValues['category'];
                field.onChange(value);
                const category = value === '' ? null : value;
                if (category === photo.category) return;
                void savePatch({ category }, 'Saving category…');
              }}
            >
              <option value="">—</option>
              {PORTFOLIO_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          )}
        />
      </td>
      <td className="py-3 pr-4 align-middle">
        <input
          type="number"
          className={`${textFieldClass} w-20`}
          aria-label="Sort order"
          placeholder="—"
          disabled={busy}
          {...register('sortOrder', {
            onBlur: () => {
              void saveField('sortOrder', 'Saving sort…');
            },
          })}
        />
      </td>
      <td className="py-3 pr-4 align-middle">
        <Controller
          name="hero"
          control={control}
          render={({ field }) => (
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                aria-label="Hero image"
                checked={field.value}
                disabled={busy}
                onChange={(event) => {
                  const hero = event.target.checked;
                  field.onChange(hero);
                  if (hero === photo.hero) return;
                  void savePatch({ hero }, 'Saving hero…');
                }}
              />
              <span>{field.value ? 'Yes' : 'No'}</span>
            </label>
          )}
        />
      </td>
      <td className={`py-3 pr-4 align-middle text-xs ${adminClass.fgMuted}`}>
        {formatAdminTime(photo.updatedAt)}
      </td>
      <td className="py-3 align-middle">
        <div className="flex flex-wrap gap-2">
          {canReprocess ? (
            <button
              type="button"
              className={`text-xs ${adminClass.linkMuted}`}
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
            className={`text-xs ${adminClass.linkMuted} ${adminClass.accent}`}
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
