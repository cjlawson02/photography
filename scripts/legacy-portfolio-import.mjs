#!/usr/bin/env node
/**
 * Bulk legacy portfolio import scaffold (T7).
 *
 * Default: dry-run only — prints planned actions, no D1/R2 writes.
 * Real import logic is _TBD_ until LEGACY_EXPORT_ROOT layout is defined (see docs/migration/legacy-bulk-import.md).
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = new Set(process.argv.slice(2));
const dryRun =
  args.has('--dry-run') ||
  args.has('-n') ||
  (process.env.DRY_RUN !== 'false' && process.env.DRY_RUN !== '0' && !args.has('--execute'));

const exportRoot = process.env.LEGACY_EXPORT_ROOT ? resolve(process.env.LEGACY_EXPORT_ROOT) : null;

function log(...parts) {
  console.log('[legacy-portfolio-import]', ...parts);
}

log(dryRun ? 'mode=dry-run (no writes)' : 'mode=execute (writes _TBD_)');

if (!exportRoot) {
  log('LEGACY_EXPORT_ROOT is unset — nothing to scan.');
  log('Set LEGACY_EXPORT_ROOT to the legacy export directory, then re-run.');
  log('See docs/migration/legacy-bulk-import.md and docs/CUTOVER.md.');
  process.exit(dryRun ? 0 : 1);
}

if (!existsSync(exportRoot)) {
  console.error(`LEGACY_EXPORT_ROOT does not exist: ${exportRoot}`);
  process.exit(1);
}

log(`export root: ${exportRoot}`);
log(
  'Importer steps (_TBD_): parse export → map metadata → upload R2 variants → insert D1 PortfolioPhotos rows.',
);

if (dryRun) {
  log(
    'Dry-run complete. Pass --execute and DRY_RUN=false when import implementation and Chris approval are ready.',
  );
  process.exit(0);
}

console.error('Execute mode is not implemented yet — export format and mapping are _TBD_.');
process.exit(1);
