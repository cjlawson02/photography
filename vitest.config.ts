import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'cloudflare:workers': path.join(root, 'src/test/cloudflare-workers-stub.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/vitest-setup.ts'],
    include: ['src/**/*.vitest.{ts,tsx}'],
    exclude: ['src/**/*.server.vitest.ts'],
  },
});
