/**
 * Point this clone at `.githooks` (versioned pre-commit runs `npm run ci`).
 * Safe no-op outside a git work tree (e.g. extracted tarball).
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: root,
    stdio: 'ignore',
  });
} catch {
  process.exit(0);
}

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: root,
  stdio: 'inherit',
});
