import { defineConfig } from 'vitest/config';

/** Node-environment Vitest for Worker/server modules. Workerd binding pilots: vitest.workers.config. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.server.vitest.ts'],
  },
});
