import { createId } from '@paralleldrive/cuid2';

import type {
  AdminPortfolioListPage,
  AdminPortfolioPhoto,
  AdminReviewCollection,
  AdminReviewCollectionDetail,
} from '../../lib/admin/trpc-types.ts';

const now = 1_700_000_000_000;

export function makeAdminReviewCollectionDetail(
  overrides: Partial<AdminReviewCollectionDetail['collection']> = {},
): AdminReviewCollectionDetail {
  const id = overrides.id ?? createId();
  return {
    collection: {
      id,
      slug: overrides.slug ?? 'proof-abc',
      title: overrides.title ?? 'Wedding proofs',
      personName: overrides.personName ?? 'Alex',
      status: overrides.status ?? 'setup',
      notes: overrides.notes ?? null,
      sharedAt: overrides.sharedAt ?? null,
      submittedAt: overrides.submittedAt ?? null,
      deliveredAt: overrides.deliveredAt ?? null,
      closedAt: overrides.closedAt ?? null,
      expiresAt: overrides.expiresAt ?? null,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
    },
    photos: [],
    finals: {
      readyCount: 0,
      unmatchedCount: 0,
      unmatched: [],
      photos: [],
    },
  };
}

export function makeAdminReviewCollection(
  overrides: Partial<AdminReviewCollection> = {},
): AdminReviewCollection {
  const id = overrides.id ?? createId();
  return {
    id,
    slug: overrides.slug ?? 'proof-abc',
    title: overrides.title ?? 'Wedding proofs',
    personName: overrides.personName ?? 'Alex',
    status: overrides.status ?? 'setup',
    notes: overrides.notes ?? null,
    sharedAt: overrides.sharedAt ?? null,
    submittedAt: overrides.submittedAt ?? null,
    deliveredAt: overrides.deliveredAt ?? null,
    closedAt: overrides.closedAt ?? null,
    expiresAt: overrides.expiresAt ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

export function makeAdminPortfolioPhoto(
  overrides: Partial<AdminPortfolioPhoto> = {},
): AdminPortfolioPhoto {
  const id = overrides.id ?? createId();
  return {
    id,
    status: overrides.status ?? 'ready',
    published: overrides.published ?? true,
    category: overrides.category ?? null,
    sortOrder: overrides.sortOrder ?? null,
    hero: overrides.hero ?? false,
    alt: overrides.alt ?? null,
    title: overrides.title ?? 'Sunset',
    caption: overrides.caption ?? null,
    mimeType: overrides.mimeType ?? 'image/jpeg',
    width: overrides.width ?? 4000,
    height: overrides.height ?? 3000,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

export function makeAdminPortfolioListPage(
  items: AdminPortfolioPhoto[] = [makeAdminPortfolioPhoto()],
): AdminPortfolioListPage {
  return { items, nextCursor: null };
}
