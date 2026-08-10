import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    env: {
      NEXT_PUBLIC_API_URL: 'http://api.test',
      NEXT_PUBLIC_SUPABASE_URL: 'http://supabase.test',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-publishable-key',
    },
    coverage: {
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
