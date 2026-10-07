import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  portfolioInspectorFormSchema,
  portfolioInspectorPatchFromField,
  type PortfolioInspectorFormValues,
  type PortfolioInspectorTextField,
} from '../../lib/admin/admin-form-schemas.ts';
import type { PortfolioPhotoAdminUpdateBody } from '../../lib/admin/portfolio-schemas.ts';
import type { AdminPortfolioPhoto } from '../../lib/admin/trpc-types.ts';
import { THUMB_VARIANT } from '../../lib/ingest/keys.ts';
import { portfolioVariantAdminUrl } from '../../lib/media/variant-media-url.ts';
import { PORTFOLIO_CATEGORIES } from '../../lib/portfolio/categories.ts';
import {
  canJoinFrontPage,
  frontPageBlockReason,
} from '../../lib/portfolio/front-page-eligibility.ts';
import { errorMessage, formatAdminDimensions, formatAdminTime } from './admin-format.ts';
import { adminClass } from './admin-styles.ts';
import AdminPrimaryButton from './AdminPrimaryButton.tsx';
import { FieldAutosaver } from './field-autosaver.ts';
import PortfolioPhotoBadges from './PortfolioPhotoBadges.tsx';
import {
  summarizeSelection,
  type FieldSummary,
  type InspectorField,
} from './portfolio-library-model.ts';

export const INSPECTOR_AUTOSAVE_MS = 700;

const MIXED = 'Mixed';
const PRIORITY_OPTIONS = [1, 2, 3, 4, 5] as const;

type SaveState = { state: 'saving' } | { state: 'saved' } | { state: 'error'; message: string };

type Props = {
  photos: AdminPortfolioPhoto[];
  onSave: (data: PortfolioPhotoAdminUpdateBody) => Promise<void>;
  onAddToFrontPage: (photos: AdminPortfolioPhoto[]) => void;
  onRemoveFromFrontPage: (photos: AdminPortfolioPhoto[]) => void;
  onRetry: (id: string) => void;
  onDelete: () => void;
  busy?: boolean;
};

function textValue(summary: FieldSummary<string | number | null>): string {
  return summary.mixed || summary.value == null ? '' : String(summary.value);
}

function FieldStatus({ id, save, error }: { id: string; save?: SaveState; error?: string }) {
  const message = error ?? (save?.state === 'error' ? save.message : null);
  if (message) {
    return (
      <p id={id} role="alert" className={`mt-1 text-xs ${adminClass.accent}`}>
        {message}
      </p>
    );
  }
  return (
    <p id={id} aria-live="polite" className={`mt-1 min-h-4 text-xs ${adminClass.fgMuted}`}>
      {save?.state === 'saving' ? 'Saving…' : save?.state === 'saved' ? 'Saved' : ''}
    </p>
  );
}

/**
 * Side inspector for one photo or a multi-selection (ADMIN-UX “Grid + inspector”). Parent keys
 * it by selection so form state resets when the selection changes.
 */
export default function PortfolioInspector({
  photos,
  onSave,
  onAddToFrontPage,
  onRemoveFromFrontPage,
  onRetry,
  onDelete,
  busy = false,
}: Props) {
  const idPrefix = useId();
  const summary = summarizeSelection(photos);
  const single = photos.length === 1 ? photos[0]! : null;
  const allReady = photos.every((photo) => photo.status === 'ready');

  const [saveStates, setSaveStates] = useState<Partial<Record<InspectorField, SaveState>>>({});
  const setSaveState = (field: InspectorField, state: SaveState) =>
    setSaveStates((current) => ({ ...current, [field]: state }));

  const form = useForm<PortfolioInspectorFormValues>({
    resolver: zodResolver(portfolioInspectorFormSchema),
    mode: 'onChange',
    defaultValues: {
      alt: textValue(summary.alt),
      title: textValue(summary.title),
      sortOrder: textValue(summary.sortOrder),
    },
  });
  const {
    register,
    getValues,
    formState: { errors },
  } = form;

  const save = async (field: InspectorField, data: PortfolioPhotoAdminUpdateBody) => {
    setSaveState(field, { state: 'saving' });
    try {
      await onSave(data);
      setSaveState(field, { state: 'saved' });
      return true;
    } catch (error) {
      setSaveState(field, { state: 'error', message: errorMessage(error) });
      return false;
    }
  };

  const [autosaver] = useState(
    () =>
      new FieldAutosaver<PortfolioInspectorTextField>(
        INSPECTOR_AUTOSAVE_MS,
        {
          alt: summary.alt.mixed ? null : textValue(summary.alt),
          title: summary.title.mixed ? null : textValue(summary.title),
          sortOrder: summary.sortOrder.mixed ? null : textValue(summary.sortOrder),
        },
        (field) => getValues(field),
      ),
  );

  useEffect(() => {
    autosaver.setSaver(async (field, raw) => {
      if (!portfolioInspectorFormSchema.shape[field].safeParse(raw).success) return 'skipped';
      return (await save(field, portfolioInspectorPatchFromField(field, raw))) ? 'saved' : 'failed';
    });
  });

  useEffect(() => () => autosaver.flushPending(), [autosaver]);

  const publishedRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (publishedRef.current) publishedRef.current.indeterminate = summary.published.mixed;
  }, [summary.published.mixed]);

  const textField = (
    field: PortfolioInspectorTextField,
    label: string,
    options: { multiline?: boolean; type?: 'number' } = {},
  ) => {
    const inputId = `${idPrefix}-${field}`;
    const statusId = `${inputId}-status`;
    const shared = {
      id: inputId,
      className: adminClass.fieldSm,
      placeholder: summary[field].mixed ? MIXED : '—',
      disabled: busy,
      'aria-describedby': statusId,
      'aria-invalid': errors[field] ? true : undefined,
      ...register(field, {
        onChange: () => autosaver.schedule(field),
        onBlur: () => void autosaver.flush(field),
      }),
    };
    return (
      <div>
        <label htmlFor={inputId} className={`block text-xs ${adminClass.fg}`}>
          {label}
        </label>
        {options.multiline ? (
          <textarea rows={2} {...shared} />
        ) : (
          <input
            type="text"
            inputMode={options.type === 'number' ? 'numeric' : undefined}
            {...shared}
          />
        )}
        <FieldStatus id={statusId} save={saveStates[field]} error={errors[field]?.message} />
      </div>
    );
  };

  const selectedTags = summary.tags.mixed ? null : summary.tags.value;
  const notOnFrontPage = photos.filter((photo) => !photo.frontPage);
  const eligible = notOnFrontPage.filter((photo) => canJoinFrontPage(photo));
  const blockedCount = notOnFrontPage.length - eligible.length;
  const onFrontPage = photos.filter((photo) => photo.frontPage);
  const thumbUrl =
    single?.status === 'ready'
      ? portfolioVariantAdminUrl(single.id, THUMB_VARIANT.suffix, single.updatedAt)
      : null;

  const toggleTag = (tag: (typeof PORTFOLIO_CATEGORIES)[number], checked: boolean) => {
    const base = selectedTags ?? [];
    const next = checked ? [...new Set([...base, tag])] : base.filter((value) => value !== tag);
    void save('tags', { tags: next });
  };

  return (
    <section aria-label="Inspector" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={`text-sm font-medium ${adminClass.fg}`}>
          {single ? single.title?.trim() || 'Untitled photo' : `${photos.length} photos selected`}
        </h3>
      </div>

      {single ? (
        <>
          {thumbUrl ? <img src={thumbUrl} alt="" className="admin-photo-grid__img" /> : null}
          <PortfolioPhotoBadges photo={single} />
          <p className={`text-xs ${adminClass.fgMuted}`}>
            {formatAdminDimensions(single.width, single.height)} · updated{' '}
            {formatAdminTime(single.updatedAt)}
          </p>
          {single.status !== 'ready' ? (
            <div className="flex gap-3">
              <button
                type="button"
                className={`text-xs ${adminClass.linkMuted}`}
                disabled={busy}
                onClick={() => onRetry(single.id)}
              >
                Retry
              </button>
              <button
                type="button"
                className={`text-xs ${adminClass.linkMuted} ${adminClass.accent}`}
                disabled={busy}
                onClick={onDelete}
              >
                Remove
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className={`text-xs ${adminClass.fgMuted}`}>
          Edits apply to every selected photo. Fields marked “{MIXED}” differ across the selection
          and stay as they are unless you change them.
        </p>
      )}

      {textField('alt', 'Alt text (required for the front page)')}
      {textField('title', 'Title')}

      <fieldset disabled={busy} className="min-w-0 border-0 p-0">
        <legend className={`text-xs ${adminClass.fg}`}>
          Categories (required for the front page)
          {summary.tags.mixed ? ` — ${MIXED.toLowerCase()}; choosing replaces all` : ''}
        </legend>
        <div className="mt-1 flex flex-col gap-1" aria-describedby={`${idPrefix}-tags-status`}>
          {PORTFOLIO_CATEGORIES.map((tag) => {
            const checked = selectedTags?.includes(tag) ?? false;
            return (
              <label
                key={tag}
                className={`inline-flex items-center gap-2 text-xs ${adminClass.fg}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    if (summary.tags.mixed) {
                      void save('tags', { tags: event.target.checked ? [tag] : [] });
                      return;
                    }
                    toggleTag(tag, event.target.checked);
                  }}
                />
                {tag}
              </label>
            );
          })}
        </div>
        <FieldStatus id={`${idPrefix}-tags-status`} save={saveStates.tags} />
      </fieldset>

      <div>
        <label htmlFor={`${idPrefix}-priority`} className={`block text-xs ${adminClass.fg}`}>
          Mosaic priority (1–5; higher gets larger slots)
        </label>
        <select
          id={`${idPrefix}-priority`}
          className={adminClass.fieldSm}
          value={summary.priority.mixed ? '' : String(summary.priority.value)}
          disabled={busy}
          aria-describedby={`${idPrefix}-priority-status`}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!PRIORITY_OPTIONS.includes(value as (typeof PRIORITY_OPTIONS)[number])) return;
            void save('priority', { priority: value });
          }}
        >
          {summary.priority.mixed ? (
            <option value="" disabled>
              {MIXED}
            </option>
          ) : null}
          {PRIORITY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
              {value === 3 ? ' (default)' : ''}
            </option>
          ))}
        </select>
        <FieldStatus id={`${idPrefix}-priority-status`} save={saveStates.priority} />
      </div>

      <div>
        <label className={`inline-flex items-center gap-2 text-xs ${adminClass.fg}`}>
          <input
            ref={publishedRef}
            type="checkbox"
            checked={!summary.published.mixed && summary.published.value}
            disabled={busy || !allReady}
            aria-describedby={`${idPrefix}-published-status`}
            onChange={(event) => void save('published', { published: event.target.checked })}
          />
          Published{summary.published.mixed ? ` (${MIXED.toLowerCase()})` : ''}
        </label>
        {!allReady ? (
          <p className={`text-xs ${adminClass.fgMuted}`}>
            Only photos that finished processing can be published.
          </p>
        ) : null}
        <FieldStatus id={`${idPrefix}-published-status`} save={saveStates.published} />
      </div>

      {textField('sortOrder', 'Sort order (All view; lower first)', { type: 'number' })}

      <div className="admin-inspector__section flex flex-col gap-2">
        <h4 className={`text-xs font-medium ${adminClass.fg}`}>Front page</h4>
        {single && single.frontPage ? (
          <p className={`text-xs ${adminClass.fgMuted}`}>
            On the front page.{' '}
            <a className={adminClass.link} href="/admin/portfolio/front-page">
              Reorder
            </a>
          </p>
        ) : null}
        {single && !single.frontPage && frontPageBlockReason(single) ? (
          <p className={`text-xs ${adminClass.accent}`}>
            Can’t join the front page yet — {frontPageBlockReason(single)}
          </p>
        ) : null}
        {!single && blockedCount > 0 ? (
          <p className={`text-xs ${adminClass.accent}`}>
            {blockedCount} selected {blockedCount === 1 ? 'photo' : 'photos'} can’t join yet — each
            needs alt text, a category, and to be published.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {eligible.length > 0 ? (
            <AdminPrimaryButton disabled={busy} onClick={() => onAddToFrontPage(eligible)}>
              {single ? 'Add to front page' : `Add ${eligible.length} to front page`}
            </AdminPrimaryButton>
          ) : null}
          {onFrontPage.length > 0 ? (
            <button
              type="button"
              className={`text-xs ${adminClass.linkMuted}`}
              disabled={busy}
              onClick={() => onRemoveFromFrontPage(onFrontPage)}
            >
              {single ? 'Remove from front page' : `Remove ${onFrontPage.length} from front page`}
            </button>
          ) : null}
        </div>
      </div>

      <div className="admin-inspector__section">
        <button
          type="button"
          className={`text-xs ${adminClass.linkMuted} ${adminClass.accent}`}
          disabled={busy}
          onClick={onDelete}
        >
          {single ? 'Delete photo…' : `Delete ${photos.length} photos…`}
        </button>
      </div>
    </section>
  );
}
