#!/usr/bin/env node
/**
 * Inventory WordPress portfolio candidates (MariaDB via NAS SSH).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadLegacyEnv, mapCategoryFromTags, PORTFOLIO_CATEGORIES, REPO_ROOT } from './env.mjs';
import { fetchPortfolioCandidates } from './wp-query.mjs';

const env = loadLegacyEnv();
const exportRoot = resolve(env.LEGACY_EXPORT_ROOT || resolve(REPO_ROOT, '.legacy-export'));
mkdirSync(exportRoot, { recursive: true });

console.log('[legacy:inventory] querying MariaDB via NAS…');
const candidates = fetchPortfolioCandidates(env);

const withCategory = candidates.map((c) => ({
  ...c,
  category: mapCategoryFromTags(c.tags),
}));

const tagCounts = {};
for (const c of withCategory) {
  const key = c.category ?? '(uncategorized)';
  tagCounts[key] = (tagCounts[key] ?? 0) + 1;
}

const heroes = withCategory.filter((c) => c.hero);
const missingFile = withCategory.filter((c) => !c.attachedFile);

console.log(`[legacy:inventory] candidates: ${withCategory.length}`);
console.log(`[legacy:inventory] heroes (Front Page Slider): ${heroes.length}`);
console.log(`[legacy:inventory] category map:`, tagCounts);
console.log(`[legacy:inventory] PORTFOLIO_CATEGORIES:`, PORTFOLIO_CATEGORIES.join(', '));
console.log(`[legacy:inventory] missing _wp_attached_file: ${missingFile.length}`);
console.log(`[legacy:inventory] sources:`, {
  post: withCategory.filter((c) => c.source === 'post').length,
  foogallery: withCategory.filter((c) => c.source === 'foogallery').length,
});

const outPath = resolve(exportRoot, 'inventory.json');
writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), candidates: withCategory }, null, 2));
console.log(`[legacy:inventory] wrote ${outPath}`);
