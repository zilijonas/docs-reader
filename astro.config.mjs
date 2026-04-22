// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'node:fs';
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

/** @param {string | undefined} value */
const normalizeSite = (value) => {
  if (!value) {
    return undefined;
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const cnamePath = path.resolve('./public/CNAME');
const configuredDomain = fs.existsSync(cnamePath)
  ? fs.readFileSync(cnamePath, 'utf8').trim()
  : undefined;

const [repositoryOwner = '', repositoryName = ''] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const isUserOrOrgSite = repositoryName !== '' && repositoryName === `${repositoryOwner}.github.io`;
const fallbackSite = repositoryOwner ? `https://${repositoryOwner}.github.io` : 'https://example.github.io';
const fallbackBase = isUserOrOrgSite || repositoryName === '' ? '/' : `/${repositoryName}/`;
const resolvedSite =
  normalizeSite(configuredDomain ? `https://${configuredDomain}` : undefined) ??
  normalizeSite(process.env.PUBLIC_SITE_URL) ??
  fallbackSite;
const resolvedHostname = new URL(resolvedSite).hostname;
const usesCustomDomain = resolvedHostname !== 'example.github.io' && !resolvedHostname.endsWith('.github.io');
const resolvedBase = usesCustomDomain
  ? '/'
  : normalizeBase(process.env.PUBLIC_BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' ? fallbackBase : '/'));

export default defineConfig({
  site: resolvedSite,
  base: resolvedBase,
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
