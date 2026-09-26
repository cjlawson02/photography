import { useState } from 'react';

import { uploadPhoto, type UploadProgress } from '../../lib/ingest/browser-upload.ts';
import { errorMessage } from './admin-format.ts';
import { adminFgMutedStyle, adminFgStyle } from './admin-styles.ts';
import AdminFieldLabel from './AdminFieldLabel.tsx';
import AdminPrimaryButton from './AdminPrimaryButton.tsx';

export type AdminPhotoUploadBucket = 'portfolio' | 'review';

type AdminPhotoUploadProps = {
  bucket: AdminPhotoUploadBucket;
  collectionId?: string;
  onSuccess?: () => void | Promise<void>;
  /** Shorter layout for strips above tables. */
  compact?: boolean;
};

export default function AdminPhotoUpload({
  bucket,
  collectionId,
  onSuccess,
  compact = false,
}: AdminPhotoUploadProps) {
  const [statusText, setStatusText] = useState<string | null>(null);
  const [putPercent, setPutPercent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const reviewMissingCollection = bucket === 'review' && !collectionId;

  return (
    <form
      className={compact ? 'flex flex-wrap items-end gap-3' : 'space-y-4'}
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
          setStatusText('Review upload requires a collection.');
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
              ? await uploadPhoto({ file, bucket, collectionId: collectionId!, onProgress })
              : await uploadPhoto({ file, bucket, onProgress });
          setPutPercent(null);
          setStatusText(
            result.status === 'ready' ? 'Upload complete.' : `Ingest: ${result.status}.`,
          );
          form.reset();
          await onSuccess?.();
        } catch (error) {
          setPutPercent(null);
          setStatusText(errorMessage(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <AdminFieldLabel
        label={compact ? 'Add photo' : 'Photo'}
        className={compact ? 'block min-w-[12rem] flex-1 text-sm' : 'block text-sm'}
      >
        <input
          type="file"
          name="file"
          accept="image/*"
          required
          disabled={busy || reviewMissingCollection}
          className="mt-1 block w-full text-sm"
          style={adminFgStyle}
        />
      </AdminFieldLabel>

      <AdminPrimaryButton type="submit" disabled={busy || reviewMissingCollection}>
        {busy ? 'Uploading…' : 'Upload'}
      </AdminPrimaryButton>

      {busy && putPercent !== null ? (
        <div className={compact ? 'w-full min-w-[10rem] flex-1 space-y-1' : 'space-y-1'}>
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

      {statusText ? (
        <p
          className={compact ? 'w-full text-xs' : 'text-xs'}
          style={adminFgMutedStyle}
          aria-live="polite"
        >
          {statusText}
        </p>
      ) : reviewMissingCollection ? (
        <p className="text-xs" style={adminFgMutedStyle}>
          Pick a collection before uploading.
        </p>
      ) : null}
    </form>
  );
}
