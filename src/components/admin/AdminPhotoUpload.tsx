import { useState } from 'react';

import { uploadPhoto, type UploadProgress } from '../../lib/ingest/browser-upload.ts';
import { errorMessage } from './admin-format.ts';
import { adminClass } from './admin-styles.ts';
import AdminFieldLabel from './AdminFieldLabel.tsx';
import AdminPrimaryButton from './AdminPrimaryButton.tsx';

export type AdminPhotoUploadBucket = 'portfolio' | 'review';

type AdminPhotoUploadProps = {
  bucket: AdminPhotoUploadBucket;
  collectionId?: string;
  /** Review bucket only — proof vs delivery final (defaults to proof). */
  reviewRound?: 'proof' | 'final';
  onSuccess?: () => void | Promise<void>;
  /** Shorter layout for strips above tables. */
  compact?: boolean;
};

function selectedFiles(form: HTMLFormElement): File[] {
  const input = form.elements.namedItem('file');
  if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files) {
    return [];
  }
  return Array.from(input.files).filter((file) => file.size > 0);
}

export default function AdminPhotoUpload({
  bucket,
  collectionId,
  reviewRound = 'proof',
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
        const files = selectedFiles(form);
        if (files.length === 0) {
          setStatusText('Choose one or more image files.');
          return;
        }
        if (bucket === 'review' && !collectionId) {
          setStatusText('Review upload requires a collection.');
          return;
        }

        setBusy(true);
        setPutPercent(null);
        let succeeded = 0;
        const failures: string[] = [];

        try {
          for (let index = 0; index < files.length; index += 1) {
            const file = files[index]!;
            const position = `${index + 1} of ${files.length}`;
            setPutPercent(null);
            setStatusText(`Requesting upload URL… (${position}: ${file.name})`);
            const onProgress = (progress: UploadProgress) => {
              setPutPercent(progress.percent);
              setStatusText(
                progress.percent === null
                  ? `Uploading to R2… (${position}: ${file.name})`
                  : `Uploading to R2… ${progress.percent}% (${position}: ${file.name})`,
              );
            };
            try {
              await (bucket === 'review'
                ? uploadPhoto({
                    file,
                    bucket,
                    collectionId: collectionId!,
                    round: reviewRound,
                    onProgress,
                  })
                : uploadPhoto({ file, bucket, onProgress }));
              succeeded += 1;
            } catch (error) {
              failures.push(`${file.name}: ${errorMessage(error)}`);
            }
          }

          setPutPercent(null);
          if (succeeded > 0) {
            form.reset();
            await onSuccess?.();
          }

          if (failures.length === 0) {
            setStatusText(succeeded === 1 ? 'Upload complete.' : `${succeeded} uploads complete.`);
          } else if (succeeded === 0) {
            setStatusText(`All uploads failed. ${failures[0]}`);
          } else {
            setStatusText(
              `${succeeded} uploaded, ${failures.length} failed. First error: ${failures[0]}`,
            );
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <AdminFieldLabel
        label={compact ? 'Add photos' : 'Photos'}
        className={compact ? 'block min-w-[12rem] flex-1 text-sm' : 'block text-sm'}
      >
        <input
          type="file"
          name="file"
          accept="image/*"
          multiple
          required
          disabled={busy || reviewMissingCollection}
          className={`mt-1 block w-full text-sm ${adminClass.fg}`}
        />
      </AdminFieldLabel>

      <AdminPrimaryButton type="submit" disabled={busy || reviewMissingCollection}>
        {busy ? 'Uploading…' : 'Upload'}
      </AdminPrimaryButton>

      {busy && putPercent !== null ? (
        <div className={compact ? 'w-full min-w-[10rem] flex-1 space-y-1' : 'space-y-1'}>
          <progress
            className={adminClass.progress}
            max={100}
            value={putPercent}
            aria-label="Upload progress"
          />
          <p className={`text-xs tabular-nums ${adminClass.fgMuted}`}>{putPercent}%</p>
        </div>
      ) : null}

      {statusText ? (
        <p
          className={`${compact ? 'w-full text-xs' : 'text-xs'} ${adminClass.fgMuted}`}
          aria-live="polite"
        >
          {statusText}
        </p>
      ) : reviewMissingCollection ? (
        <p className={`text-xs ${adminClass.fgMuted}`}>Pick a collection before uploading.</p>
      ) : null}
    </form>
  );
}
