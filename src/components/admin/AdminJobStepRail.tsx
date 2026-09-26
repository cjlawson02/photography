import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';
import {
  buildJobStepRail,
  jobStepLabel,
  jobStepLeadingAction,
  jobStepSecondaryActions,
  type JobStepPrimaryAction,
} from '../../lib/review/job-steps.ts';
import { adminClass } from './admin-styles.ts';
import AdminPrimaryButton from './AdminPrimaryButton.tsx';

type AdminJobStepRailProps = {
  status: ReviewJobStatus;
  reviewPath: string;
  adminPreviewPath?: string;
  hasReadyFinals?: boolean;
  primaryAction: JobStepPrimaryAction;
  onMarkShared?: () => void;
  markSharedPending?: boolean;
  onCopyFilenames?: () => void;
  copyFilenamesPending?: boolean;
  onReopenPicks?: () => void;
  reopenPicksPending?: boolean;
  onMarkDelivered?: () => void;
  markDeliveredPending?: boolean;
  onReplaceFinals?: () => void;
  replaceFinalsPending?: boolean;
  onMarkClosed?: () => void;
  markClosedPending?: boolean;
  onCopyDeliveryMessage?: () => void;
  copyDeliveryMessagePending?: boolean;
};

export function AdminJobStatusBadge({ status }: { status: ReviewJobStatus }) {
  return (
    <span className={`admin-job-badge admin-job-badge--${status}`}>{jobStepLabel(status)}</span>
  );
}

export default function AdminJobStepRail(props: AdminJobStepRailProps) {
  const { status, reviewPath, adminPreviewPath, hasReadyFinals = false, primaryAction } = props;
  const steps = buildJobStepRail(status);
  const leadingAction = adminPreviewPath
    ? jobStepLeadingAction({ status, adminPreviewPath, hasReadyFinals })
    : null;
  const secondaryActions = jobStepSecondaryActions(status, reviewPath);

  const renderAction = (action: JobStepPrimaryAction, className?: string) => {
    const button = (onClick: (() => void) | undefined, pending: boolean | undefined) => (
      <AdminPrimaryButton
        key={action.kind}
        type="button"
        className={className}
        disabled={pending}
        onClick={() => onClick?.()}
      >
        {action.label}
      </AdminPrimaryButton>
    );
    switch (action.kind) {
      case 'upload_proofs':
      case 'upload_finals':
        return (
          <a
            key={action.kind}
            className={`${adminClass.btnPrimary} ${className ?? ''}`.trim()}
            href={action.href}
          >
            {action.label}
          </a>
        );
      case 'preview_client':
      case 'preview_download':
        return (
          <a
            key={`${action.kind}:${action.href}`}
            className={`${adminClass.btnPrimary} ${className ?? ''}`.trim()}
            href={action.href}
            target="_blank"
            rel="noreferrer"
          >
            {action.label}
          </a>
        );
      case 'mark_shared':
        return button(props.onMarkShared, props.markSharedPending);
      case 'copy_filenames':
        return button(props.onCopyFilenames, props.copyFilenamesPending);
      case 'reopen_picks':
        return button(props.onReopenPicks, props.reopenPicksPending);
      case 'mark_delivered':
        return button(props.onMarkDelivered, props.markDeliveredPending);
      case 'replace_finals':
        return button(props.onReplaceFinals, props.replaceFinalsPending);
      case 'mark_closed':
        return button(props.onMarkClosed, props.markClosedPending);
      case 'copy_delivery_message':
        return button(props.onCopyDeliveryMessage, props.copyDeliveryMessagePending);
      case 'none':
        return (
          <p key={action.kind} className={`text-sm ${adminClass.fgMuted}`}>
            {action.label}
          </p>
        );
    }
  };

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
        {leadingAction ? renderAction(leadingAction, 'mr-3') : null}
        {renderAction(primaryAction)}
        {secondaryActions.map((action) => renderAction(action, 'ml-3'))}
      </div>
    </section>
  );
}
