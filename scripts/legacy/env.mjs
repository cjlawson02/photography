/**
 * Load migration env from `.legacy-export/.env` then optional `.dev.vars`.
 * Never commit either file.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '../..');

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i <= 0) continue;
    out[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return out;
}

/** @returns {Record<string, string>} */
export function loadLegacyEnv(extraEnv = process.env) {
  const fromFiles = {
    ...parseEnvFile(resolve(REPO_ROOT, '.legacy-export/.env')),
    ...parseEnvFile(resolve(REPO_ROOT, '.dev.vars')),
  };
  return { ...fromFiles, ...extraEnv };
}

export function requireEnv(env, keys) {
  const missing = keys.filter((k) => !env[k]?.trim());
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
}

export function isDryRun(argv = process.argv.slice(2), env = process.env) {
  const args = new Set(argv);
  if (args.has('--execute')) return false;
  if (args.has('--dry-run') || args.has('-n')) return true;
  return env.DRY_RUN !== 'false' && env.DRY_RUN !== '0';
}

export function d1Target(env) {
  const t = (env.D1_TARGET || 'local').trim().toLowerCase();
  if (t !== 'local' && t !== 'remote') {
    throw new Error(`D1_TARGET must be local|remote, got ${t}`);
  }
  return t;
}

export const PORTFOLIO_CATEGORIES = ['Friends', 'Nature', 'Portraits', 'People', 'Beach'];

/** Prefer more specific tags when a post has several. */
const CATEGORY_PRIORITY = ['Portraits', 'Friends', 'People', 'Beach', 'Nature'];

export function mapCategoryFromTags(tags) {
  const set = new Set((tags || []).map((t) => String(t).trim()));
  for (const name of CATEGORY_PRIORITY) {
    if (set.has(name)) return name;
  }
  for (const tag of set) {
    const hit = PORTFOLIO_CATEGORIES.find((c) => c.toLowerCase() === tag.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

export const VARIANT_SPECS = [
  { suffix: 'gallery.webp', width: 1600 },
  { suffix: 'thumb.webp', width: 400 },
];

export function originalKey(id) {
  return `${id}/original`;
}

export function variantKey(id, suffix) {
  return `${id}/${suffix}`;
}

export function photoIngestObjectKeys(id) {
  return [originalKey(id), ...VARIANT_SPECS.map((s) => variantKey(id, s.suffix))];
}

export { REPO_ROOT };
