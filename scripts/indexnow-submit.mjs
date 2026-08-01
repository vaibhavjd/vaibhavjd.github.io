// Pings IndexNow (Bing/Yandex and friends) with URLs whose data changed in
// the latest publish. Runs as a post-deploy workflow step — never on staging.
//
//   node scripts/indexnow-submit.mjs            → submits meta.json changed_urls
//   node scripts/indexnow-submit.mjs --all      → submits every sitemap URL
//
// Google ignores IndexNow; its path is sitemap lastmod + Search Console.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = 'c9e2f7a14b8d4e06a3f5d1c8b7e90a42';
const site = (process.env.PUBLIC_SITE_URL || 'https://mylabtests.github.io').replace(/\/$/, '');
const staging = process.env.PUBLIC_STAGING !== 'false';

if (staging) {
  console.log('indexnow: staging build — skipping submission');
  process.exit(0);
}

async function sitemapUrls() {
  const urls = [];
  const index = await (await fetch(`${site}/sitemap-index.xml`)).text();
  const children = [...index.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  for (const child of children) {
    const xml = await (await fetch(child)).text();
    urls.push(...[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]));
  }
  return urls;
}

const all = process.argv.includes('--all');
let urlList;
if (all) {
  urlList = await sitemapUrls();
} else {
  const meta = JSON.parse(readFileSync(join(root, 'data', 'published', 'meta.json'), 'utf8'));
  urlList = (meta.changed_urls || []).map((p) => (p.startsWith('http') ? p : `${site}${p}`));
}

if (urlList.length === 0) {
  console.log('indexnow: no changed URLs to submit');
  process.exit(0);
}

const payload = {
  host: new URL(site).host,
  key: KEY,
  keyLocation: `${site}/${KEY}.txt`,
  urlList: urlList.slice(0, 10000),
};

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});

console.log(`indexnow: submitted ${payload.urlList.length} URLs → HTTP ${res.status}`);
if (res.status >= 400) process.exit(1);
