import { useEffect, useId, useRef, type ReactNode } from 'react';

import { adminClass } from './admin-styles.ts';
import AdminPrimaryButton from './AdminPrimaryButton.tsx';

type AdminConfirmDialogProps = {
  open: boolean;
  title: string;
  /** Plain-language consequences (ADMIN-UX destructive tier “Confirm dialog”). */
  children: ReactNode;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function AdminConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="admin-dialog-backdrop">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`admin-dialog ${adminClass.panel}`}
      >
        <h2 id={titleId} className={`text-base font-medium ${adminClass.fg}`}>
          {title}
        </h2>
        <div className={`mt-3 text-sm ${adminClass.fgMuted}`}>{children}</div>
        <div className="mt-6 flex justify-end gap-4">
          <button
            ref={cancelRef}
            type="button"
            className={`text-sm ${adminClass.linkMuted}`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <AdminPrimaryButton disabled={pending} onClick={onConfirm}>
            {pending ? 'Working…' : confirmLabel}
          </AdminPrimaryButton>
        </div>
      </div>
    </div>
  );
}
