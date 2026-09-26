import * as Sentry from '@sentry/cloudflare';
import handler from '@astrojs/cloudflare/entrypoints/server';

import { sentryOptionsFromEnv } from './src/lib/observability/sentry.ts';

export default Sentry.withSentry(sentryOptionsFromEnv, handler);
