#!/usr/bin/env node
/**
 * CI gate (FIX-39): apply D1 migrations to an ephemeral local DB and fail if any SQL
 * under src/db/migrations remain unapplied (schema drift vs wrangler journal).
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const persistTo = mkdtempSync(join(tmpdir(), 'photography-d1-check-'));

function wrangler(args) {
  const result = spawnSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || 'wrangler failed\n');
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

try {
  wrangler(['d1', 'migrations', 'apply', 'photography', '--local', `--persist-to=${persistTo}`]);

  const listOutput = wrangler([
    'd1',
    'migrations',
    'list',
    'photography',
    '--local',
    `--persist-to=${persistTo}`,
  ]);

  if (!listOutput.includes('No migrations to apply')) {
    process.stderr.write('D1 migration drift: unapplied files remain after local apply.\n');
    process.stderr.write(listOutput);
    process.exit(1);
  }

  process.stdout.write('D1 migrations check OK (all SQL applied locally).\n');
} finally {
  rmSync(persistTo, { recursive: true, force: true });
}
