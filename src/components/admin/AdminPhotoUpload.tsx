import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminPhotoUploadFormSchema,
  type AdminPhotoUploadFormValues,
} from '../../lib/admin/admin-form-schemas.ts';
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

export default function AdminPhotoUpload({
  bucket,
  collectionId,
  reviewRound = 'proof',
  onSuccess,
  compact = false,
}: AdminPhotoUploadProps) {
  const [statusText, setStatusText] = useState<string | null>(null);
  const [putPercent, setPutPercent] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdminPhotoUploadFormValues>({
    resolver: zodResolver(adminPhotoUploadFormSchema),
  });

  const reviewMissingCollection = bucket === 'review' && !collectionId;
  const disabled = isSubmitting || reviewMissingCollection;
  const filesError = errors.files?.message;

  const onValid = async (values: AdminPhotoUploadFormValues) => {
    if (bucket === 'review' && !collectionId) {
      setStatusText('Review upload requires a collection.');
      return;
    }

    const files = Array.from(values.files).filter((file) => file.size > 0);
    setPutPercent(null);
    let succeeded = 0;
    const failures: string[] = [];

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
      reset();
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
  };

  return (
    <div className={compact ? 'flex flex-wrap items-end gap-3' : 'space-y-4'}>
      <AdminFieldLabel
        label={compact ? 'Add photos' : 'Photos'}
        className={compact ? 'block min-w-[12rem] flex-1 text-sm' : 'block text-sm'}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          aria-invalid={filesError ? true : undefined}
          className={`mt-1 block w-full text-sm ${adminClass.fg}`}
          {...register('files')}
        />
      </AdminFieldLabel>

      {/* type="button" + handleSubmit: avoid native GET navigation before island hydration. */}
      <AdminPrimaryButton
        type="button"
        disabled={disabled}
        onClick={() => {
          void handleSubmit(onValid)();
        }}
      >
        {isSubmitting ? 'Uploading…' : 'Upload'}
      </AdminPrimaryButton>

      {isSubmitting && putPercent !== null ? (
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

      {filesError ? (
        <p
          className={`${compact ? 'w-full text-xs' : 'text-xs'} ${adminClass.fgMuted}`}
          role="alert"
        >
          {filesError}
        </p>
      ) : statusText ? (
        <p
          className={`${compact ? 'w-full text-xs' : 'text-xs'} ${adminClass.fgMuted}`}
          aria-live="polite"
        >
          {statusText}
        </p>
      ) : reviewMissingCollection ? (
        <p className={`text-xs ${adminClass.fgMuted}`}>Pick a collection before uploading.</p>
      ) : null}
    </div>
  );
}
