import { describe, expect, it, vi } from 'vitest';

import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';
import type { AppEnv } from '../env.ts';
import { AppError } from '../http/app-error.ts';
import { VARIANT_SPECS, variantKey } from '../ingest/keys.ts';
import { IngestService } from './ingest-service.ts';

function blobToReadableStream(blob: Blob): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const buf = await blob.arrayBuffer();
      controller.enqueue(new Uint8Array(buf));
      controller.close();
    },
  });
}

/** Node <24 test runners lack `Blob.prototype.stream` (ingest uses it after arrayBuffer). */
function ensureBlobStreamPolyfill(): void {
  if (typeof Blob.prototype.stream === 'function') {
    return;
  }
  Blob.prototype.stream = function stream(this: Blob) {
    return blobToReadableStream(this);
  } as typeof Blob.prototype.stream;
}

ensureBlobStreamPolyfill();

const PHOTO_ID = 'photo-test-id-001';

function mockR2Object(bytes = 100): R2ObjectBody {
  const buffer = new Uint8Array(bytes);
  return {
    arrayBuffer: async () => buffer.buffer,
    size: bytes,
  } as R2ObjectBody;
}

function createIngestApp(overrides: {
  photo?: { id: string; status: 'pending' | 'failed' | 'ready' } | null;
  updateIfStatus?: ReturnType<typeof vi.fn>;
  getByIdAfterUpdate?: { id: string; status: string } | null;
}): AppEnv {
  const photo =
    overrides.photo === undefined ? { id: PHOTO_ID, status: 'pending' as const } : overrides.photo;

  const updateIfStatus =
    overrides.updateIfStatus ??
    vi.fn(async () => (photo ? { ...photo, status: 'ready' as const } : null));

  let getByIdCalls = 0;
  const getById = vi.fn(async () => {
    getByIdCalls += 1;
    if (overrides.getByIdAfterUpdate !== undefined && getByIdCalls > 1) {
      return overrides.getByIdAfterUpdate;
    }
    return photo;
  });

  const deleteObjects = vi.fn(async () => undefined);
  const put = vi.fn(async () => undefined);
  const get = vi.fn(async () => mockR2Object());

  const portfolioPhotos = {
    getById,
    updateIfStatus,
  };

  return {
    d1: {
      portfolioPhotos,
      reviewPhotos: portfolioPhotos,
      reviewCollections: { getById: vi.fn() },
    },
    r2: { get, put, deleteObjects, createPresignedPutUrl: vi.fn() },
    images: {
      toWebp: vi.fn(async () => new ReadableStream()),
      readDimensions: vi.fn(async () => ({ width: 100, height: 80 })),
    },
  } as unknown as AppEnv;
}

function createPresignApp(collectionStatus: ReviewJobStatus): AppEnv {
  return {
    d1: {
      reviewCollections: {
        getById: vi.fn(async () => ({ id: 'col-1', status: collectionStatus })),
      },
      reviewPhotos: { insert: vi.fn(async () => ({ id: PHOTO_ID })) },
    },
    r2: {
      createPresignedPutUrl: vi.fn(async () => ({
        uploadUrl: 'https://r2.example/put',
        expiresInSeconds: 3600,
      })),
    },
  } as unknown as AppEnv;
}

describe('IngestService.createPresign finals gate', () => {
  it('seeds portfolio title from the upload filename', async () => {
    const insert = vi.fn(async () => ({ id: PHOTO_ID }));
    const app = {
      d1: {
        portfolioPhotos: { insert },
      },
      r2: {
        createPresignedPutUrl: vi.fn(async () => ({
          uploadUrl: 'https://r2.example/put',
          expiresInSeconds: 3600,
        })),
      },
    } as unknown as AppEnv;

    await new IngestService(app).createPresign({
      bucket: 'portfolio',
      contentType: 'image/jpeg',
      filename: 'IMG_0973.jpg',
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        mimeType: 'image/jpeg',
        title: 'IMG_0973',
      }),
    );
  });

  it.each(['editing', 'finals_delivered'] as const)('allows finals while %s', async (status) => {
    const app = createPresignApp(status);
    const result = await new IngestService(app).createPresign({
      bucket: 'review',
      collectionId: 'col-1',
      contentType: 'image/jpeg',
      filename: 'DSC_1234.jpg',
      round: 'final',
    });
    expect(result.id).toBe(PHOTO_ID);
    expect(app.d1.reviewPhotos.insert).toHaveBeenCalledWith(
      expect.objectContaining({ round: 'final' }),
    );
  });

  it.each(['setup', 'proofs_uploaded', 'shared', 'picks_submitted', 'closed'] as const)(
    'rejects finals while %s without inserting a row',
    async (status) => {
      const app = createPresignApp(status);
      const error = await new IngestService(app)
        .createPresign({
          bucket: 'review',
          collectionId: 'col-1',
          contentType: 'image/jpeg',
          round: 'final',
        })
        .catch((e) => e);
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('PRECONDITION_FAILED');
      expect((error as AppError).message).toMatch(/Editing or Finals delivered/);
      expect(app.d1.reviewPhotos.insert).not.toHaveBeenCalled();
      expect(app.r2.createPresignedPutUrl).not.toHaveBeenCalled();
    },
  );

  it.each(['setup', 'closed', 'editing'] as const)(
    'leaves proof uploads unaffected while %s',
    async (status) => {
      const app = createPresignApp(status);
      await expect(
        new IngestService(app).createPresign({
          bucket: 'review',
          collectionId: 'col-1',
          contentType: 'image/jpeg',
        }),
      ).resolves.toMatchObject({ id: PHOTO_ID });
      await expect(
        new IngestService(app).createPresign({
          bucket: 'review',
          collectionId: 'col-1',
          contentType: 'image/jpeg',
          round: 'proof',
        }),
      ).resolves.toMatchObject({ id: PHOTO_ID });
    },
  );
});

describe('IngestService.processFromOriginal', () => {
  it('deletes orphaned variants when markReady finds a deleted row', async () => {
    const updateIfStatus = vi.fn(async () => null);
    const app = createIngestApp({
      photo: { id: PHOTO_ID, status: 'pending' },
      updateIfStatus,
      getByIdAfterUpdate: null,
    });
    const service = new IngestService(app);

    await expect(
      service.completeIngest({ id: PHOTO_ID, bucket: 'portfolio' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const expectedVariants = VARIANT_SPECS.map((spec) => variantKey(PHOTO_ID, spec.suffix));
    expect(app.r2.deleteObjects).toHaveBeenCalledWith('portfolio', expectedVariants);
  });

  it('deletes orphaned variants when a concurrent complete wins the pending transition', async () => {
    const updateIfStatus = vi.fn(async () => null);
    const app = createIngestApp({
      photo: { id: PHOTO_ID, status: 'pending' },
      updateIfStatus,
      getByIdAfterUpdate: { id: PHOTO_ID, status: 'ready' },
    });
    const service = new IngestService(app);

    await expect(
      service.completeIngest({ id: PHOTO_ID, bucket: 'portfolio' }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });

    const expectedVariants = VARIANT_SPECS.map((spec) => variantKey(PHOTO_ID, spec.suffix));
    expect(app.r2.deleteObjects).toHaveBeenCalledWith('portfolio', expectedVariants);
  });

  it('does not mark failed when reprocess fails on an already-ready photo', async () => {
    const updateIfStatus = vi.fn();
    const app = createIngestApp({
      photo: { id: PHOTO_ID, status: 'ready' },
      updateIfStatus,
    });
    app.images.toWebp = vi.fn(async () => {
      throw new Error('Images transform failed');
    });
    const service = new IngestService(app);

    await expect(service.reprocess({ id: PHOTO_ID, bucket: 'portfolio' })).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Images transform failed',
    });

    expect(updateIfStatus).not.toHaveBeenCalled();
  });

  it('preserves the original error when markFailed cannot update a deleted row', async () => {
    const updateIfStatus = vi.fn(async () => null);
    const app = createIngestApp({
      photo: { id: PHOTO_ID, status: 'pending' },
      updateIfStatus,
    });
    app.images.toWebp = vi.fn(async () => {
      throw new Error('Compress blew up');
    });
    const service = new IngestService(app);

    const error = await service
      .completeIngest({ id: PHOTO_ID, bucket: 'portfolio' })
      .catch((e) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('INTERNAL_SERVER_ERROR');
    expect((error as AppError).message).toBe('Compress blew up');
  });
});
