#!/usr/bin/env node
/**
 * Import WordPress portfolio candidates into D1 + R2.
 * Default dry-run. --execute writes. D1_TARGET=local|remote.
 */
import { createId } from '@paralleldrive/cuid2';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import {
  d1Target,
  isDryRun,
  loadLegacyEnv,
  mapCategoryFromTags,
  originalKey,
  REPO_ROOT,
  VARIANT_SPECS,
  variantKey,
} from './env.mjs';
import { d1Execute, putLocalBytes, putRemoteObject, sqlString, wranglerOauthToken } from './r2.mjs';
import { fetchPortfolioCandidates } from './wp-query.mjs';

function loadManifest(path) {
  if (!existsSync(path)) return { photos: {} };
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveManifest(path, manifest) {
  writeFileSync(path, JSON.stringify(manifest, null, 2));
}

function resolveUploadPath(uploadsRoot, attachedFile) {
  const rel = String(attachedFile).replace(/^\/+/, '');
  const full = resolve(uploadsRoot, rel);
  if (existsSync(full)) return full;
  // Sometimes WP stores without year subdirs inconsistently
  return null;
}

async function encodeVariants(sourcePath) {
  const input = sharp(sourcePath, { failOn: 'none' }).rotate();
  const meta = await input.metadata();
  const original = await input.toBuffer();
  const variants = {};
  for (const spec of VARIANT_SPECS) {
    variants[spec.suffix] = await sharp(sourcePath, { failOn: 'none' })
      .rotate()
      .resize({ width: spec.width, withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();
  }
  return {
    original,
    variants,
    width: meta.width ?? null,
    height: meta.height ?? null,
    mimeType:
      meta.format === 'jpeg' ? 'image/jpeg' : meta.format ? `image/${meta.format}` : 'image/jpeg',
  };
}

function insertSql(row) {
  const now = Date.now();
  return `INSERT INTO PortfolioPhotos (
    id, createdAt, updatedAt, status, mimeType, published, category, sortOrder, hero, width, height, alt, title, caption
  ) VALUES (
    ${sqlString(row.id)},
    ${now},
    ${now},
    'ready',
    ${sqlString(row.mimeType)},
    1,
    ${sqlString(row.category)},
    ${row.sortOrder == null ? 'NULL' : Number(row.sortOrder)},
    ${row.hero ? 1 : 0},
    ${row.width == null ? 'NULL' : Number(row.width)},
    ${row.height == null ? 'NULL' : Number(row.height)},
    ${sqlString(row.alt)},
    ${sqlString(row.title)},
    ${sqlString(row.caption)}
  );`;
}

async function main() {
  const env = loadLegacyEnv();
  const dryRun = isDryRun();
  const target = d1Target(env);
  const exportRoot = resolve(env.LEGACY_EXPORT_ROOT || resolve(REPO_ROOT, '.legacy-export'));
  const uploadsRoot = resolve(exportRoot, 'uploads');
  const manifestPath = resolve(exportRoot, 'import-manifest.json');
  const inventoryPath = resolve(exportRoot, 'inventory.json');

  console.log(`[legacy:import] mode=${dryRun ? 'dry-run' : 'execute'} target=${target}`);
  console.log(`[legacy:import] uploads root: ${uploadsRoot}`);

  if (!existsSync(uploadsRoot) && !dryRun) {
    throw new Error(
      `Uploads not staged at ${uploadsRoot}. Run npm run migrate:legacy:stage -- --execute first.`,
    );
  }

  let candidates;
  if (existsSync(inventoryPath)) {
    candidates = JSON.parse(readFileSync(inventoryPath, 'utf8')).candidates;
    console.log(`[legacy:import] loaded inventory.json (${candidates.length})`);
  } else {
    console.log('[legacy:import] fetching candidates from MariaDB…');
    candidates = fetchPortfolioCandidates(env).map((c) => ({
      ...c,
      category: mapCategoryFromTags(c.tags),
    }));
  }

  const manifest = loadManifest(manifestPath);
  if (!manifest.photos) manifest.photos = {};
  const token = target === 'remote' && !dryRun ? wranglerOauthToken() : null;

  let planned = 0;
  let skipped = 0;
  let imported = 0;
  let missing = 0;

  for (const c of candidates) {
    const wpId = String(c.wpAttachmentId);
    const prior = manifest.photos[wpId];
    // Idempotent per target — local import must not block a later remote run.
    if (prior && prior.target === target) {
      skipped += 1;
      continue;
    }

    const filePath = c.attachedFile ? resolveUploadPath(uploadsRoot, c.attachedFile) : null;
    if (!filePath) {
      missing += 1;
      console.warn(`[legacy:import] MISSING file for wp#${wpId}: ${c.attachedFile}`);
      continue;
    }

    const id = createId();
    const category = c.category ?? mapCategoryFromTags(c.tags);
    planned += 1;

    console.log(
      `[legacy:import] ${dryRun ? 'would import' : 'import'} wp#${wpId} → ${id} (${c.source}) ${c.attachedFile} cat=${category ?? 'null'} hero=${!!c.hero}`,
    );

    if (dryRun) continue;

    const encoded = await encodeVariants(filePath);

    // Upload original + variants
    const put =
      target === 'remote'
        ? async (key, bytes, contentType) => putRemoteObject(key, bytes, contentType, token)
        : async (key, bytes, contentType) => putLocalBytes(key, bytes, contentType);

    await put(originalKey(id), encoded.original, encoded.mimeType);
    for (const spec of VARIANT_SPECS) {
      await put(variantKey(id, spec.suffix), encoded.variants[spec.suffix], 'image/webp');
    }

    d1Execute(
      target,
      insertSql({
        id,
        mimeType: encoded.mimeType,
        category,
        sortOrder: c.sortOrder,
        hero: !!c.hero,
        width: encoded.width,
        height: encoded.height,
        alt: c.alt,
        title: c.title,
        caption: c.caption,
      }),
    );

    manifest.photos[wpId] = {
      id,
      attachedFile: c.attachedFile,
      source: c.source,
      importedAt: new Date().toISOString(),
      target,
    };
    saveManifest(manifestPath, manifest);
    imported += 1;
  }

  console.log('[legacy:import] summary', { planned, imported, skipped, missing, dryRun, target });
  if (dryRun) {
    console.log('[legacy:import] Dry-run complete. Pass --execute (and DRY_RUN=false) to write.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
