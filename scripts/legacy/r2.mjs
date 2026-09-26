/**
 * R2 helpers for legacy migration — local via wrangler, remote via CF API + OAuth.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { REPO_ROOT } from './env.mjs';

const BUCKET = 'photography-portfolio';
const ACCOUNT_ID = 'c5d18577a688210711261e1b3c2ffb71';

export function wranglerOauthToken() {
  const toml = readFileSync(resolve(process.env.HOME, '.wrangler/config/default.toml'), 'utf8');
  const m = toml.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!m) throw new Error('No wrangler oauth_token');
  return m[1];
}

function encodeObjectKey(key) {
  return key
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
}

export async function listRemoteKeys(token = wranglerOauthToken()) {
  const keys = [];
  let cursor = null;
  for (;;) {
    const url = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects`,
    );
    url.searchParams.set('per_page', '1000');
    if (cursor) url.searchParams.set('cursor', cursor);
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await resp.json();
    if (!data.success) throw new Error(JSON.stringify(data.errors));
    for (const obj of data.result || []) {
      keys.push(typeof obj === 'string' ? obj : obj.key);
    }
    cursor = data.result_info?.cursor || null;
    if (!cursor || !(data.result || []).length) break;
  }
  return keys;
}

export async function putRemoteObject(key, bytes, contentType, token = wranglerOauthToken()) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeObjectKey(key)}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body: bytes,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.success === false) {
    throw new Error(`R2 PUT ${key} failed: ${resp.status} ${JSON.stringify(data)}`);
  }
}

export async function deleteRemoteObject(key, token = wranglerOauthToken()) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeObjectKey(key)}`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.success === false) {
    throw new Error(`R2 DELETE ${key} failed: ${resp.status} ${JSON.stringify(data)}`);
  }
}

export function putLocalObject(key, filePath, contentType) {
  const r = spawnSync(
    'npx',
    [
      'wrangler',
      'r2',
      'object',
      'put',
      `${BUCKET}/${key}`,
      '--file',
      filePath,
      '--content-type',
      contentType,
      '--local',
      '-y',
    ],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  if (r.status !== 0) {
    throw new Error(`local R2 put ${key} failed: ${r.stderr || r.stdout}`);
  }
}

export function putLocalBytes(key, bytes, contentType) {
  const dir = mkdtempSync(join(tmpdir(), 'legacy-r2-'));
  const path = join(dir, 'blob');
  writeFileSync(path, bytes);
  try {
    putLocalObject(key, path, contentType);
  } finally {
    try {
      unlinkSync(path);
    } catch {
      /* ignore */
    }
  }
}

export function d1Execute(target, sql) {
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
  if (r.status !== 0) {
    throw new Error(`d1 execute failed: ${r.stderr || r.stdout}`);
  }
  return r.stdout;
}

export function sqlString(value) {
  if (value == null) return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}

export { BUCKET, ACCOUNT_ID };
