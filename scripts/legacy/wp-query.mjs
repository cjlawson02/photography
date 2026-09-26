/**
 * Run SQL against live WordPress MariaDB via SSH + docker on the NAS
 * (DB user is not open to laptop LAN IPs).
 */
import { spawnSync } from 'node:child_process';
import { loadLegacyEnv, requireEnv } from './env.mjs';

/**
 * @param {string} sql
 * @param {{ env?: Record<string, string>, json?: boolean }} [opts]
 * @returns {string} stdout (TSV by default)
 */
export function runWpSql(sql, opts = {}) {
  const env = opts.env ?? loadLegacyEnv();
  requireEnv(env, ['WP_DB_HOST', 'WP_DB_USER', 'WP_DB_PASSWORD', 'WP_DB_NAME']);
  const host = env.WP_DB_HOST;
  const user = env.WP_DB_USER;
  const password = env.WP_DB_PASSWORD;
  const database = env.WP_DB_NAME;
  const sshHost = env.LEGACY_SSH_HOST || '172.16.1.2';

  // Pipe SQL on stdin to docker mariadb client on NAS host network.
  const remote = [
    'docker',
    'run',
    '--rm',
    '-i',
    '--network',
    'host',
    'mariadb:11.8.9',
    'mariadb',
    `-h${host}`,
    `-u${user}`,
    `-p${password}`,
    database,
    ...(opts.json ? ['--batch', '--raw'] : ['--batch', '--raw']),
  ].join(' ');

  const result = spawnSync('ssh', ['-o', 'BatchMode=yes', sshHost, remote], {
    input: sql,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || '').trim();
    throw new Error(`WP SQL failed (exit ${result.status}): ${err.slice(0, 800)}`);
  }

  // Strip mysql password warning lines
  return (result.stdout || '')
    .split('\n')
    .filter((line) => !line.includes('Using a password on the command line'))
    .join('\n');
}

/** Parse `mariadb --batch --raw` TSV with header row into objects. */
export function parseTsv(stdout) {
  const lines = stdout.trimEnd().split('\n').filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cols = line.split('\t');
    /** @type {Record<string, string | null>} */
    const row = {};
    headers.forEach((h, i) => {
      const v = cols[i] ?? '';
      row[h] = v === 'NULL' ? null : v;
    });
    return row;
  });
}

/**
 * Portfolio candidates: published posts with featured images + FooGallery attachments.
 * @returns {Promise<import('./types.js').LegacyPhotoCandidate[]>}
 */
export function fetchPortfolioCandidates(env = loadLegacyEnv()) {
  const prefix = env.WP_TABLE_PREFIX || 'wp_';

  const postsSql = `
SELECT
  p.ID AS post_id,
  p.post_title AS title,
  p.post_excerpt AS caption,
  p.menu_order AS menu_order,
  UNIX_TIMESTAMP(p.post_date) * 1000 AS post_date_ms,
  thumb.meta_value AS attachment_id,
  af.meta_value AS attached_file,
  alt.meta_value AS alt_text,
  GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ',') AS tags,
  MAX(CASE WHEN tc.name = 'Front Page Slider' THEN 1 ELSE 0 END) AS is_hero
FROM ${prefix}posts p
JOIN ${prefix}postmeta thumb ON thumb.post_id = p.ID AND thumb.meta_key = '_thumbnail_id'
LEFT JOIN ${prefix}postmeta af ON af.post_id = thumb.meta_value AND af.meta_key = '_wp_attached_file'
LEFT JOIN ${prefix}postmeta alt ON alt.post_id = thumb.meta_value AND alt.meta_key = '_wp_attachment_image_alt'
LEFT JOIN ${prefix}term_relationships tr ON tr.object_id = p.ID
LEFT JOIN ${prefix}term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy = 'post_tag'
LEFT JOIN ${prefix}terms t ON t.term_id = tt.term_id
LEFT JOIN ${prefix}term_relationships trc ON trc.object_id = p.ID
LEFT JOIN ${prefix}term_taxonomy ttc ON ttc.term_taxonomy_id = trc.term_taxonomy_id AND ttc.taxonomy = 'category'
LEFT JOIN ${prefix}terms tc ON tc.term_id = ttc.term_id
WHERE p.post_type = 'post' AND p.post_status = 'publish'
GROUP BY p.ID
ORDER BY p.menu_order ASC, p.post_date ASC;
`;

  const postRows = parseTsv(runWpSql(postsSql, { env }));

  /** @type {Map<string, object>} */
  const byAttachment = new Map();

  for (const row of postRows) {
    const attachmentId = String(row.attachment_id);
    const tags = row.tags ? String(row.tags).split(',').filter(Boolean) : [];
    byAttachment.set(attachmentId, {
      source: 'post',
      wpPostId: Number(row.post_id),
      wpAttachmentId: Number(attachmentId),
      title: row.title || null,
      caption: row.caption || null,
      alt: row.alt_text || null,
      attachedFile: row.attached_file,
      tags,
      hero: String(row.is_hero) === '1',
      sortOrder: Number(row.menu_order) || null,
      postDateMs: Number(row.post_date_ms) || null,
    });
  }

  return [...byAttachment.values()].sort((a, b) => {
    const ao = a.sortOrder ?? 999999;
    const bo = b.sortOrder ?? 999999;
    if (ao !== bo) return ao - bo;
    return (a.postDateMs ?? 0) - (b.postDateMs ?? 0);
  });
}
