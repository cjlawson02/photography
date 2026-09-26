import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

/** Workerd pool for binding pilots (`*.workers.vitest.ts`). Node suites stay in vitest.server.config. */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.workers-test.jsonc' },
    }),
  ],
  test: {
    include: ['src/**/*.workers.vitest.ts'],
  },
});
