import { useEffect } from 'react';

import { initAdminBrowserSentry } from '../../lib/observability/sentry-browser.ts';

type AdminSentryInitProps = {
  dsn: string;
  release?: string;
};

/** Initializes `@sentry/react` once per admin document (mounted from `AdminLayout`). */
export default function AdminSentryInit({ dsn, release }: AdminSentryInitProps) {
  useEffect(() => {
    initAdminBrowserSentry({ dsn, ...(release ? { release } : {}) });
  }, [dsn, release]);

  return null;
}
