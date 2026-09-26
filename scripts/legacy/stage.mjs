#!/usr/bin/env node
/**
 * Stage wp-content/uploads from NAS into LEGACY_EXPORT_ROOT/uploads via rsync.
 */
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isDryRun, loadLegacyEnv, requireEnv, REPO_ROOT } from './env.mjs';

const env = loadLegacyEnv();
requireEnv(env, ['LEGACY_NAS_SCP']);
const exportRoot = resolve(env.LEGACY_EXPORT_ROOT || resolve(REPO_ROOT, '.legacy-export'));
const dest = resolve(exportRoot, 'uploads');
const dryRun = isDryRun();

mkdirSync(dest, { recursive: true });

const source = env.LEGACY_NAS_SCP.replace(/\/?$/, '/');
console.log(`[legacy:stage] ${dryRun ? 'dry-run' : 'execute'} rsync`);
console.log(`[legacy:stage] from ${source}`);
console.log(`[legacy:stage] to   ${dest}`);

const args = [
  '-a',
  '--info=stats2',
  ...(dryRun ? ['--dry-run'] : []),
  // Skip Picu client collections and optimizer caches
  '--exclude',
  'picu/',
  '--exclude',
  'cache/',
  '--exclude',
  'wpo/',
  '--exclude',
  'wpcf7_uploads/',
  '--exclude',
  'sb-instagram-feed-images/',
  source,
  `${dest}/`,
];

const result = spawnSync('rsync', ['-e', 'ssh -o BatchMode=yes', ...args], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (result.stdout) console.log(result.stdout);
if (result.stderr) console.error(result.stderr);
if (result.status !== 0) {
  console.error(`[legacy:stage] rsync failed with exit ${result.status}`);
  process.exit(result.status ?? 1);
}

if (!dryRun && !existsSync(dest)) {
  console.error('[legacy:stage] destination missing after rsync');
  process.exit(1);
}

console.log('[legacy:stage] done');
