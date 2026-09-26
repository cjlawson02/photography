import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/vitest-setup.ts'],
    include: ['src/**/*.vitest.{ts,tsx}'],
    exclude: ['src/**/*.server.vitest.ts'],
  },
});
