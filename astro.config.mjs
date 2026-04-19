// @ts-check
import { defineConfig } from 'astro/config';
import path from 'node:path';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

/** @param {string | undefined} value */
const normalizeBase = (value) => {
  if (!value || value === '/') {
    return '/';
  }

  const trimmed = value.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
};

const [repositoryOwner = '', repositoryName = ''] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const isUserOrOrgSite = repositoryName !== '' && repositoryName === `${repositoryOwner}.github.io`;
const fallbackSite = repositoryOwner ? `https://${repositoryOwner}.github.io` : 'https://example.github.io';
const fallbackBase = isUserOrOrgSite || repositoryName === '' ? '/' : `/${repositoryName}/`;

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? fallbackSite,
  base: normalizeBase(process.env.PUBLIC_BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' ? fallbackBase : '/')),
  output: 'static',
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
