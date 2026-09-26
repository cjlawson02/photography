#!/usr/bin/env node
/**
 * Upload Wrangler worker bundle source maps to Sentry (production deploy only).
 * Requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_RELEASE, and WRANGLER_OUTDIR.
 */
import { spawnSync } from 'node:child_process';

const required = ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_RELEASE'];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.log(`sentry-upload-worker-sourcemaps: skip (missing ${missing.join(', ')})`);
  process.exit(0);
}

const outdir = process.env.WRANGLER_OUTDIR?.trim() || '.worker-sentry-out';
const release = process.env.SENTRY_RELEASE.trim();
const org = process.env.SENTRY_ORG.trim();
const project = process.env.SENTRY_PROJECT.trim();

const cliArgs = [
  'sourcemaps',
  'upload',
  '--org',
  org,
  '--project',
  project,
  '--release',
  release,
  outdir,
];

const result = spawnSync('npx', ['@sentry/cli', ...cliArgs], {
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
