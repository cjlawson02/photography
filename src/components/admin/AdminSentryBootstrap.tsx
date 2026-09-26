import { useEffect } from 'react';

import {
  initAdminSentry,
  type AdminSentryInitConfig,
} from '../../lib/observability/sentry-browser.ts';

type Props = AdminSentryInitConfig;

/** Initializes Sentry once per admin page (mount in `AdminLayout`). */
export default function AdminSentryBootstrap({ dsn, release }: Props) {
  useEffect(() => {
    initAdminSentry({ dsn, release });
  }, [dsn, release]);

  return null;
}
