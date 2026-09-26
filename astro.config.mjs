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

/** Upload client source maps during production builds when CI provides Sentry credentials. */
function sentryBuildPlugins() {
  if (!sentryAuthToken || !sentryRelease || !sentryOrg || !sentryProject) {
    return [];
  }

  return [
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
  ];
}

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: cloudflare(),
  vite: {
    build: {
      sourcemap: sentryAuthToken && sentryRelease ? 'hidden' : false,
    },
    plugins: [tailwindcss(), ...sentryBuildPlugins()],
  },
});
