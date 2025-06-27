import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/bi-format-web-reader/',
  
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

