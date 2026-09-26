import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';
import {
  buildJobStepRail,
  jobStepLabel,
  jobStepSecondaryAction,
  type JobStepPrimaryAction,
} from '../../lib/review/job-steps.ts';
import { adminClass } from './admin-styles.ts';
import AdminPrimaryButton from './AdminPrimaryButton.tsx';

type AdminJobStepRailProps = {
  status: ReviewJobStatus;
  primaryAction: JobStepPrimaryAction;
  onMarkShared?: () => void;
  markSharedPending?: boolean;
  onCopyFilenames?: () => void;
  copyFilenamesPending?: boolean;
  onReopenPicks?: () => void;
  reopenPicksPending?: boolean;
};

export function AdminJobStatusBadge({ status }: { status: ReviewJobStatus }) {
  return (
    <span className={`admin-job-badge admin-job-badge--${status}`}>{jobStepLabel(status)}</span>
  );
}

export default function AdminJobStepRail({
  status,
  primaryAction,
  onMarkShared,
  markSharedPending,
  onCopyFilenames,
  copyFilenamesPending,
  onReopenPicks,
  reopenPicksPending,
}: AdminJobStepRailProps) {
  const steps = buildJobStepRail(status);
  const secondaryAction = jobStepSecondaryAction(status);

  return (
    <section className="admin-job-rail" aria-label="Shoot job steps">
      <ol className="admin-job-rail__list">
        {steps.map((step) => (
          <li
            key={step.status}
            className={`admin-job-rail__step admin-job-rail__step--${step.state}`}
          >
            <span className="admin-job-rail__marker" aria-hidden="true">
              {step.state === 'complete' ? '✓' : step.state === 'current' ? '●' : '○'}
            </span>
            <div className="admin-job-rail__copy">
              <span className="admin-job-rail__label">{step.label}</span>
              {step.state === 'current' ? (
                <p className={`admin-job-rail__desc ${adminClass.fgMuted}`}>{step.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="admin-job-rail__action">
        {primaryAction.kind === 'upload_proofs' ? (
          <a className={adminClass.btnPrimary} href={primaryAction.href}>
            {primaryAction.label}
          </a>
        ) : null}
        {primaryAction.kind === 'mark_shared' ? (
          <AdminPrimaryButton
            type="button"
            disabled={markSharedPending}
            onClick={() => onMarkShared?.()}
          >
            {primaryAction.label}
          </AdminPrimaryButton>
        ) : null}
        {primaryAction.kind === 'preview_client' ? (
          <a
            className={adminClass.btnPrimary}
            href={primaryAction.href}
            target="_blank"
            rel="noreferrer"
          >
            {primaryAction.label}
          </a>
        ) : null}
        {primaryAction.kind === 'copy_filenames' ? (
          <AdminPrimaryButton
            type="button"
            disabled={copyFilenamesPending}
            onClick={() => onCopyFilenames?.()}
          >
            {primaryAction.label}
          </AdminPrimaryButton>
        ) : null}
        {primaryAction.kind === 'none' ? (
          <p className={`text-sm ${adminClass.fgMuted}`}>{primaryAction.label}</p>
        ) : null}
        {secondaryAction ? (
          <AdminPrimaryButton
            type="button"
            className="ml-3"
            disabled={reopenPicksPending}
            onClick={() => onReopenPicks?.()}
          >
            {secondaryAction.label}
          </AdminPrimaryButton>
        ) : null}
      </div>
    </section>
  );
}
