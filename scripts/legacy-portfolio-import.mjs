#!/usr/bin/env node
/**
 * Bulk legacy portfolio import (T7).
 *
 * Default: dry-run. Subcommands via npm scripts or:
 *   node scripts/legacy-portfolio-import.mjs [inventory|stage|wipe|import] [--execute]
 *
 * See docs/migration/legacy-bulk-import.md
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const cmd = ['inventory', 'stage', 'wipe', 'import'].includes(args[0]) ? args[0] : 'import';
const rest = ['inventory', 'stage', 'wipe', 'import'].includes(args[0]) ? args.slice(1) : args;

const scriptMap = {
  inventory: 'scripts/legacy/inventory.mjs',
  stage: 'scripts/legacy/stage.mjs',
  wipe: 'scripts/legacy/wipe-portfolio.mjs',
  import: 'scripts/legacy/import-portfolio.mjs',
};

const script = resolve(REPO, scriptMap[cmd]);
console.log(`[legacy-portfolio-import] running ${cmd}…`);
const result = spawnSync(process.execPath, [script, ...rest], {
  cwd: REPO,
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
