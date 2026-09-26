/**
 * Browser upload client (v1): presign → PUT to R2 → completion callback.
 * Admin mutations use tRPC (`/admin/api/trpc`); same-origin sends Access cookie on `/admin*`.
 */

import { TRPCClientError } from '@trpc/client';

import type { PurposeBucket } from '../dao/r2-dao.ts';
import { ingestContentTypeSchema, type PresignBody } from './schemas.ts';
import { adminTrpc } from '../trpc/client.ts';

export type PresignResponse = {
  id: string;
  bucket: PurposeBucket;
  key: string;
  contentType: string;
  uploadUrl: string;
  expiresInSeconds: number;
  collectionId?: string;
};

export type CompleteResponse = {
  id: string;
  bucket: PurposeBucket;
  status: 'ready';
  variants: string[];
};

export type UploadResult = {
  id: string;
  bucket: PurposeBucket;
  status: 'ready';
  variants: string[];
};

export type UploadProgress = {
  loaded: number;
  total: number;
  /** 0–100 when size is known; otherwise null */
  percent: number | null;
};

type UploadProgressHandler = (progress: UploadProgress) => void;

type PortfolioUpload = {
  file: File;
  bucket: 'portfolio';
  onProgress?: UploadProgressHandler;
};

type ReviewUpload = {
  file: File;
  bucket: 'review';
  /** Required for review — FK to ReviewCollections. */
  collectionId: string;
  round?: 'proof' | 'final';
  onProgress?: UploadProgressHandler;
};

function trpcMessage(error: unknown, fallback: string): string {
  if (error instanceof TRPCClientError) {
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

/**
 * Full v1 ingest path from the browser.
 * Requires Cloudflare Access session (cookie) on `/admin*`.
 * Review uploads must pass `collectionId`.
 */
export async function uploadPhoto(options: PortfolioUpload | ReviewUpload): Promise<UploadResult> {
  const mimeType = options.file.type.trim();
  if (!mimeType) {
    throw new Error(
      'File type is missing — use a format the browser recognizes or rename with a known extension',
    );
  }
  const parsedType = ingestContentTypeSchema.safeParse(mimeType);
  if (!parsedType.success) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  const contentType = parsedType.data;
  const presign = await requestPresign({
    bucket: options.bucket,
    contentType,
    filename: options.file.name,
    collectionId: options.bucket === 'review' ? options.collectionId : undefined,
    round: options.bucket === 'review' ? options.round : undefined,
  });

  await putFileWithProgress(presign.uploadUrl, options.file, contentType, options.onProgress);

  const complete = await requestComplete({
    id: presign.id,
    bucket: options.bucket,
  });

  return {
    id: complete.id,
    bucket: complete.bucket,
    status: complete.status,
    variants: complete.variants,
  };
}

export async function requestPresign(input: {
  bucket: PurposeBucket;
  contentType: PresignBody['contentType'];
  filename?: string;
  /** Required when `bucket` is `review`. */
  collectionId?: string;
  round?: 'proof' | 'final';
}): Promise<PresignResponse> {
  try {
    const body: PresignBody =
      input.bucket === 'review'
        ? {
            bucket: 'review',
            contentType: input.contentType,
            collectionId: requireReviewCollectionId(input.collectionId),
            ...(input.filename ? { filename: input.filename } : {}),
            ...(input.round ? { round: input.round } : {}),
          }
        : {
            bucket: 'portfolio',
            contentType: input.contentType,
            ...(input.filename ? { filename: input.filename } : {}),
          };

    return await adminTrpc.ingest.presign.mutate(body);
  } catch (error) {
    throw new Error(trpcMessage(error, 'Presign failed'));
  }
}

export async function requestComplete(input: {
  id: string;
  bucket: PurposeBucket;
}): Promise<CompleteResponse> {
  try {
    return await adminTrpc.ingest.complete.mutate({
      id: input.id,
      bucket: input.bucket,
    });
  } catch (error) {
    throw new Error(trpcMessage(error, 'Complete failed'));
  }
}

export async function requestReprocess(input: {
  id: string;
  bucket: PurposeBucket;
}): Promise<CompleteResponse> {
  try {
    return await adminTrpc.ingest.reprocess.mutate({
      id: input.id,
      bucket: input.bucket,
    });
  } catch (error) {
    throw new Error(trpcMessage(error, 'Reprocess failed'));
  }
}

function requireReviewCollectionId(collectionId: string | undefined): string {
  const trimmed = collectionId?.trim();
  if (!trimmed) {
    throw new Error('collectionId is required for review uploads');
  }
  return trimmed;
}

/**
 * PUT file bytes to a presigned URL with upload progress (XHR — `fetch` has no upload progress).
 */
function putFileWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress?: UploadProgressHandler,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.addEventListener('progress', (event) => {
      if (!onProgress) return;
      const total = event.lengthComputable ? event.total : file.size;
      const loaded = event.loaded;
      let percent: number | null = null;
      if (event.lengthComputable && event.total > 0) {
        percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      } else if (file.size > 0) {
        percent = Math.min(100, Math.round((loaded / file.size) * 100));
      }
      onProgress({ loaded, total, percent });
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`R2 PUT failed (${xhr.status})`));
      }
    });
    xhr.addEventListener('error', () => {
      reject(new Error('R2 PUT failed (network error)'));
    });
    xhr.addEventListener('abort', () => {
      reject(new Error('R2 PUT aborted'));
    });

    xhr.send(file);
  });
}
