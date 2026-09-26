#!/usr/bin/env node
/**
 * Wipe portfolio D1 rows + photography-portfolio R2 objects.
 * Default dry-run. Pass --execute. D1_TARGET=local|remote (default local).
 */
import { spawnSync } from 'node:child_process';
import {
  d1Target,
  isDryRun,
  loadLegacyEnv,
  photoIngestObjectKeys,
  REPO_ROOT,
} from './env.mjs';
import { deleteRemoteObject, listRemoteKeys, wranglerOauthToken } from './r2.mjs';

const BUCKET = 'photography-portfolio';

function d1Execute(target, sql, dryRun) {
  console.log(`[legacy:wipe] D1 ${target}: ${sql}`);
  if (dryRun) return;
  const r = spawnSync(
    'npx',
    [
      'wrangler',
      'd1',
      'execute',
      'photography',
      target === 'remote' ? '--remote' : '--local',
      '--command',
      sql,
    ],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  if (r.stdout) console.log(r.stdout);
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error(`d1 execute failed (${r.status})`);
  }
}

function listLocalPhotoIds() {
  const r = spawnSync(
    'npx',
    [
      'wrangler',
      'd1',
      'execute',
      'photography',
      '--local',
      '--json',
      '--command',
      'SELECT id FROM PortfolioPhotos;',
    ],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  if (r.status !== 0) return [];
  try {
    return (JSON.parse(r.stdout)[0]?.results ?? []).map((row) => row.id);
  } catch {
    return [];
  }
}

async function wipeLocalR2(ids, dryRun) {
  const keys = ids.flatMap((id) => photoIngestObjectKeys(id));
  console.log(`[legacy:wipe] local R2 keys to remove: ${keys.length}`);
  if (dryRun) return;
  for (const key of keys) {
    spawnSync(
      'npx',
      ['wrangler', 'r2', 'object', 'delete', `${BUCKET}/${key}`, '--local', '-y'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
  }
}

async function main() {
  const env = loadLegacyEnv();
  const dryRun = isDryRun();
  const target = d1Target(env);
  console.log(`[legacy:wipe] mode=${dryRun ? 'dry-run' : 'execute'} target=${target}`);

  if (target === 'local') {
    const ids = listLocalPhotoIds();
    console.log(`[legacy:wipe] local PortfolioPhotos rows: ${ids.length}`);
    d1Execute('local', 'DELETE FROM PortfolioPhotos;', dryRun);
    await wipeLocalR2(ids, dryRun);
  } else {
    const countR = spawnSync(
      'npx',
      [
        'wrangler',
        'd1',
        'execute',
        'photography',
        '--remote',
        '--json',
        '--command',
        'SELECT COUNT(*) AS n FROM PortfolioPhotos;',
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    console.log('[legacy:wipe] remote D1:', countR.stdout?.trim());

    const token = wranglerOauthToken();
    const keys = await listRemoteKeys(token);
    console.log(`[legacy:wipe] remote R2 objects: ${keys.length}`);
    for (const k of keys.slice(0, 20)) console.log(`  - ${k}`);
    if (keys.length > 20) console.log(`  … +${keys.length - 20} more`);

    d1Execute('remote', 'DELETE FROM PortfolioPhotos;', dryRun);
    if (!dryRun) {
      let n = 0;
      for (const key of keys) {
        await deleteRemoteObject(key, token);
        n += 1;
        if (n % 25 === 0) console.log(`[legacy:wipe] deleted ${n}/${keys.length}`);
      }
    }
  }

  console.log('[legacy:wipe] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
