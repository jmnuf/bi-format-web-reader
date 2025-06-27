import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@runtime': path.resolve(__dirname, './src/runtime'),
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxFactory: 'jsx',
    jsxImportSource: '@runtime',
  },
});

