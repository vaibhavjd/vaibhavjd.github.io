// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// One env var drives every absolute URL on the site (canonicals, OG, sitemaps,
// JSON-LD). Domain cutover = change this in the deploy workflow and rebuild.
const site = process.env.PUBLIC_SITE_URL || 'https://mylabtests.github.io';

export default defineConfig({
  site,
  trailingSlash: 'always',
  output: 'static',
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
});
