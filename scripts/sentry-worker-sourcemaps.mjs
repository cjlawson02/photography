#!/usr/bin/env node
/**
 * Upload Wrangler worker bundle source maps to Sentry (see docs/DEPLOY.md).
 * Skips when SENTRY_AUTH_TOKEN / org / project / release are unset (PR CI without secrets).
 *
 * Expects `wrangler deploy --outdir dist-worker --upload-source-maps` (default outdir below).
 */
import { spawnSync } from 'node:child_process';

/** Must match `wrangler deploy --outdir` (not Astro `dist/`). */
const WRANGLER_SOURCEMAP_OUTDIR = 'dist-worker';

const required = ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_RELEASE'];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.log(`sentry:sourcemaps skip (missing ${missing.join(', ')})`);
  process.exit(0);
}

const outdir = process.env.WRANGLER_SOURCEMAP_OUTDIR?.trim() || WRANGLER_SOURCEMAP_OUTDIR;
const release = process.env.SENTRY_RELEASE.trim();
const org = process.env.SENTRY_ORG.trim();
const project = process.env.SENTRY_PROJECT.trim();

function runSentryCli(args) {
  return spawnSync('npx', ['@sentry/cli', ...args], {
    stdio: 'inherit',
    env: process.env,
  });
}

const newRelease = runSentryCli(['releases', 'new', release, '--org', org, '--project', project]);
if (newRelease.status !== 0) {
  console.log('sentry:sourcemaps: release already exists or create skipped; continuing upload');
}

const upload = runSentryCli([
  'sourcemaps',
  'upload',
  '--org',
  org,
  '--project',
  project,
  '--release',
  release,
  outdir,
]);

if (upload.status !== 0) {
  process.exit(upload.status ?? 1);
}
