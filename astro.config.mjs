// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sentryRelease = process.env.SENTRY_RELEASE?.trim();
const sentryOrg = process.env.SENTRY_ORG?.trim();
const sentryProject = process.env.SENTRY_PROJECT?.trim();

const sentryClientUploadEnabled = Boolean(
  sentryAuthToken && sentryRelease && sentryOrg && sentryProject,
);

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: cloudflare(),
  vite: {
    build: {
      sourcemap: sentryClientUploadEnabled ? 'hidden' : false,
    },
    plugins: [
      tailwindcss(),
      ...(sentryClientUploadEnabled
        ? [
            sentryVitePlugin({
              org: sentryOrg,
              project: sentryProject,
              authToken: sentryAuthToken,
              release: { name: sentryRelease },
              sourcemaps: {
                filesToDeleteAfterUpload: ['./dist/**/**/*.map', './dist/**/*.map'],
              },
              telemetry: false,
            }),
          ]
        : []),
    ],
  },
});
