import { defineConfig } from 'vitest/config';

/** Node-environment Vitest for Worker/server modules (FIX-28 slice; workers pool TBD). */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.server.vitest.ts'],
  },
});
