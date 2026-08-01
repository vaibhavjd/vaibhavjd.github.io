// Post-build guard: every internal href in dist/ must resolve to a built
// page. The publish gate removes pages as provider coverage changes, so link
// modules can silently start pointing at 404s — this catches that.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(dist)) {
  console.error('dist/ not found — run the build first');
  process.exit(1);
}

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* htmlFiles(full);
    else if (full.endsWith('.html')) yield full;
  }
}

const pages = [...htmlFiles(dist)];
const exists = (path) => {
  const clean = path.split('#')[0].split('?')[0];
  if (clean === '/') return existsSync(join(dist, 'index.html'));
  const rel = clean.replace(/^\/|\/$/g, '');
  return (
    existsSync(join(dist, rel, 'index.html')) ||
    existsSync(join(dist, rel)) ||
    existsSync(join(dist, `${rel}.html`))
  );
};

const broken = new Map();
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    const href = m[1];
    if (href.startsWith('//')) continue;
    if (/\.(css|js|svg|png|jpg|webp|ico|xml|txt|json)$/.test(href.split('?')[0])) continue;
    if (!exists(href)) {
      const from = file.replace(dist, '').replace(/\\/g, '/');
      if (!broken.has(href)) broken.set(href, new Set());
      broken.get(href).add(from);
    }
  }
}

if (broken.size) {
  console.error(`check-links: ${broken.size} internal link target(s) do not exist:\n`);
  for (const [href, froms] of [...broken].slice(0, 25)) {
    console.error(`  ${href}`);
    console.error(`      linked from ${[...froms].slice(0, 3).join(', ')}${froms.size > 3 ? ` (+${froms.size - 3} more)` : ''}`);
  }
  process.exit(1);
}
console.log(`check-links clean — ${pages.length} pages, every internal link resolves`);
