import { beforeEach, describe, expect, it, vi } from 'vitest';

const photoById = new Map<string, Record<string, unknown>>();
const collectionById = new Map<string, Record<string, unknown>>();

vi.mock('../../db/client.ts', () => ({ createDb: () => ({}) }));
vi.mock('../dao/review-photos-dao.ts', () => ({
  ReviewPhotosDAO: class {
    async getById(id: string) {
      return photoById.get(id) ?? null;
    }
  },
}));
vi.mock('../dao/review-collections-dao.ts', () => ({
  ReviewCollectionsDAO: class {
    async getById(id: string) {
      return collectionById.get(id) ?? null;
    }
  },
}));

import {
  isReviewMediaAllowed,
  isReviewMediaAllowedForAdmin,
  reviewOriginalDownloadFilename,
} from './review-media-access.ts';

const db = {} as D1Database;

function seed(status: string) {
  collectionById.set('c1', { id: 'c1', status, expiresAt: null });
  photoById.set('proof', {
    id: 'proof',
    collectionId: 'c1',
    status: 'ready',
    round: 'proof',
    originalFilename: null,
    mimeType: 'image/jpeg',
  });
  photoById.set('final', {
    id: 'final',
    collectionId: 'c1',
    status: 'ready',
    round: 'final',
    originalFilename: null,
    mimeType: 'image/png',
  });
}

describe('review media access', () => {
  beforeEach(() => {
    photoById.clear();
    collectionById.clear();
  });

  it('hides finals from the public route until the job is delivered', async () => {
    seed('editing');
    expect(await isReviewMediaAllowed(db, 'final')).toBe(false);
    expect(await isReviewMediaAllowed(db, 'final', { allowOriginal: true })).toBe(false);
    seed('finals_delivered');
    expect(await isReviewMediaAllowed(db, 'final', { allowOriginal: true })).toBe(true);
  });

  it('lets admins preview final originals before delivery, but never proof originals', async () => {
    seed('editing');
    expect(await isReviewMediaAllowedForAdmin(db, 'final', { allowOriginal: true })).toBe(true);
    expect(await isReviewMediaAllowedForAdmin(db, 'proof', { allowOriginal: true })).toBe(false);
    expect(await isReviewMediaAllowedForAdmin(db, 'proof')).toBe(true);
  });

  it('rejects admin media for photos that are not ready', async () => {
    seed('editing');
    photoById.set('final', { ...photoById.get('final'), status: 'pending' });
    expect(await isReviewMediaAllowedForAdmin(db, 'final', { allowOriginal: true })).toBe(false);
    expect(await isReviewMediaAllowedForAdmin(db, 'missing')).toBe(false);
  });

  it('derives the download filename from the MIME type when none was stored', async () => {
    seed('finals_delivered');
    expect(await reviewOriginalDownloadFilename(db, 'final')).toBe('final.png');
    expect(await reviewOriginalDownloadFilename(db, 'missing')).toBeNull();
  });
});
