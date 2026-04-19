// @ts-check
import { defineConfig } from 'astro/config';
import path from 'node:path';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  site: 'https://example.github.io',
  base: isProduction ? '/docs-reader/' : '/',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('./src'),
      },
    },
  },
});
