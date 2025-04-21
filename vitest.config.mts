import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// @ts-ignore
const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // setupFiles: ['./test/setup.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'test/**', '**/*.test.{js,ts}', '**/*.spec.{js,ts}', 'dist/**'],
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          decoratorMetadata: true,
          legacyDecorator: true,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './libs/ddd2'),
      '@app/libs': resolve(__dirname, './libs/ddd2/src'),
      '@/utils': resolve(__dirname, './libs/ddd2/utils'),
      '@/domain': resolve(__dirname, './libs/ddd2/domain'),
    },
  },
});
