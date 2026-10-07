import type { PortfolioPhotoAdminUpdateBody } from '../../lib/admin/portfolio-schemas.ts';
import type { AdminPortfolioPhoto } from '../../lib/admin/trpc-types.ts';
import { isStalePendingIngest } from '../../lib/ingest/stale-pending.ts';
import type { PortfolioCategory } from '../../lib/portfolio/categories.ts';
import { needsDetails } from '../../lib/portfolio/front-page-eligibility.ts';

export const LIBRARY_STATE_FILTERS = [
  { value: 'all', label: 'All states' },
  { value: 'needsDetails', label: 'Needs details' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'published', label: 'Published' },
  { value: 'frontPage', label: 'On front page' },
] as const;

export type LibraryStateFilter = (typeof LIBRARY_STATE_FILTERS)[number]['value'];
export type LibraryCategoryFilter = 'all' | 'uncategorized' | PortfolioCategory;

export type LibraryFilters = {
  state: LibraryStateFilter;
  category: LibraryCategoryFilter;
};

function matchesState(photo: AdminPortfolioPhoto, state: LibraryStateFilter): boolean {
  switch (state) {
    case 'all':
      return true;
    case 'needsDetails':
      return needsDetails(photo);
    case 'processing':
      return photo.status === 'pending';
    case 'failed':
      return photo.status === 'failed';
    case 'unpublished':
      return photo.status === 'ready' && !photo.published;
    case 'published':
      return photo.status === 'ready' && photo.published;
    case 'frontPage':
      return photo.frontPage;
  }
}

function tagsKey(tags: readonly string[]) {
  return tags.toSorted().join('\0');
}

export function matchesLibraryFilters(photo: AdminPortfolioPhoto, filters: LibraryFilters) {
  if (!matchesState(photo, filters.state)) return false;
  if (filters.category === 'all') return true;
  if (filters.category === 'uncategorized') return photo.tags.length === 0;
  return photo.tags.includes(filters.category);
}

export type PhotoBadge = { label: string; attention: boolean; title?: string };

/** One badge vocabulary for tiles and the inspector (processing → lifecycle → front page). */
export function portfolioPhotoBadges(photo: AdminPortfolioPhoto): PhotoBadge[] {
  if (photo.status === 'pending') {
    return isStalePendingIngest(photo.createdAt)
      ? [
          {
            label: 'Stale',
            attention: true,
            title: 'Upload never finished — retry or remove it',
          },
        ]
      : [{ label: 'Processing', attention: false }];
  }
  if (photo.status === 'failed') return [{ label: 'Failed', attention: true }];
  const badges: PhotoBadge[] = [];
  if (needsDetails(photo)) {
    badges.push({
      label: 'Needs details',
      attention: true,
      title: 'Add alt text and a category',
    });
  }
  badges.push({ label: photo.published ? 'Published' : 'Unpublished', attention: false });
  if (photo.frontPage) badges.push({ label: 'Front page', attention: false });
  return badges;
}

export const INSPECTOR_FIELDS = [
  'alt',
  'title',
  'tags',
  'priority',
  'published',
  'sortOrder',
] as const;

export type InspectorField = (typeof INSPECTOR_FIELDS)[number];

export type FieldSummary<T> = { mixed: true } | { mixed: false; value: T };

export type SelectionSummary = {
  [K in InspectorField]: FieldSummary<AdminPortfolioPhoto[K]>;
};

function summarize<K extends InspectorField>(
  photos: readonly AdminPortfolioPhoto[],
  field: K,
): FieldSummary<AdminPortfolioPhoto[K]> {
  const first = photos[0]![field];
  if (field === 'tags') {
    const key = tagsKey(first as string[]);
    return photos.every((photo) => tagsKey(photo.tags) === key)
      ? { mixed: false, value: first }
      : { mixed: true };
  }
  return photos.every((photo) => photo[field] === first)
    ? { mixed: false, value: first }
    : { mixed: true };
}

/** Per-field shared value across the selection, or `mixed` when photos disagree. */
export function summarizeSelection(photos: readonly AdminPortfolioPhoto[]): SelectionSummary {
  if (photos.length === 0) throw new Error('summarizeSelection needs at least one photo');
  return {
    alt: summarize(photos, 'alt'),
    title: summarize(photos, 'title'),
    tags: summarize(photos, 'tags'),
    priority: summarize(photos, 'priority'),
    published: summarize(photos, 'published'),
    sortOrder: summarize(photos, 'sortOrder'),
  };
}

/**
 * Undo payloads: group photos by their previous values for `fields` so each group restores
 * with one `bulkUpdate`.
 */
export function restorePatches(
  photos: readonly AdminPortfolioPhoto[],
  fields: readonly (keyof PortfolioPhotoAdminUpdateBody)[],
): { ids: string[]; data: PortfolioPhotoAdminUpdateBody }[] {
  const groups = new Map<string, { ids: string[]; data: PortfolioPhotoAdminUpdateBody }>();
  for (const photo of photos) {
    const data = Object.fromEntries(
      fields.map((field) => [field, photo[field as keyof AdminPortfolioPhoto]]),
    ) as PortfolioPhotoAdminUpdateBody;
    const key = JSON.stringify(data);
    const group = groups.get(key);
    if (group) group.ids.push(photo.id);
    else groups.set(key, { ids: [photo.id], data });
  }
  return [...groups.values()];
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
