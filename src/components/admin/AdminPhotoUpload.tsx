import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminPhotoUploadFormSchema,
  type AdminPhotoUploadFormValues,
} from '../../lib/admin/admin-form-schemas.ts';
import { uploadPhoto, type UploadProgress } from '../../lib/ingest/browser-upload.ts';
import { mapPool } from '../../lib/utils/map-pool.ts';
import { errorMessage } from './admin-format.ts';
import { adminClass } from './admin-styles.ts';
import AdminFieldLabel from './AdminFieldLabel.tsx';
import AdminPrimaryButton from './AdminPrimaryButton.tsx';

export type AdminPhotoUploadBucket = 'portfolio' | 'review';

/** Max concurrent browser → R2 uploads (presign + PUT + complete). */
export const ADMIN_UPLOAD_CONCURRENCY = 5;

type AdminPhotoUploadProps = {
  bucket: AdminPhotoUploadBucket;
  collectionId?: string;
  /** Review bucket only — proof vs delivery final (defaults to proof). */
  reviewRound?: 'proof' | 'final';
  onSuccess?: () => void | Promise<void>;
  /** Shorter layout for strips above tables. */
  compact?: boolean;
};

type FileUploadOutcome = { ok: true } | { ok: false; message: string };

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
    const total = files.length;
    const filePercents: Array<number | null> = Array.from({ length: total }, () => null);
    let finished = 0;

    const refreshProgress = () => {
      const activeSum = filePercents.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      const overall = Math.round((finished * 100 + activeSum) / total);
      setPutPercent(overall);
      setStatusText(
        finished === 0
          ? `Uploading ${Math.min(ADMIN_UPLOAD_CONCURRENCY, total)} of ${total}…`
          : `Uploading… ${finished} of ${total} finished`,
      );
    };

    setPutPercent(0);
    refreshProgress();

    const outcomes = await mapPool(files, ADMIN_UPLOAD_CONCURRENCY, async (file, index) => {
      const onProgress = (progress: UploadProgress) => {
        filePercents[index] = progress.percent ?? 0;
        refreshProgress();
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
        finished += 1;
        filePercents[index] = null;
        refreshProgress();
        return { ok: true } satisfies FileUploadOutcome;
      } catch (error) {
        finished += 1;
        filePercents[index] = null;
        refreshProgress();
        return {
          ok: false,
          message: `${file.name}: ${errorMessage(error)}`,
        } satisfies FileUploadOutcome;
      }
    });

    const succeeded = outcomes.filter((outcome) => outcome.ok).length;
    const failures = outcomes
      .filter((outcome): outcome is { ok: false; message: string } => !outcome.ok)
      .map((outcome) => outcome.message);

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
