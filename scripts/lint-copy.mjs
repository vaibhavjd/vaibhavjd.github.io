// Fails the build when page copy contains phrases from
// content/style/banned-phrases.txt — the mechanical half of the
// "reads human, always" content standard.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const phrases = readFileSync(join(root, 'content', 'style', 'banned-phrases.txt'), 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = phrases.map((p) => ({
  phrase: p,
  re: new RegExp(`(?<![\\w-])${escape(p)}(?![\\w-])`, 'i'),
}));

const SCAN_DIRS = ['src/pages', 'src/components', 'src/layouts'];
const SCAN_FILES = ['data/published/tests.json'];
const EXTS = new Set(['.astro', '.tsx', '.ts', '.md', '.json']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTS.has(full.slice(full.lastIndexOf('.')))) yield full;
  }
}

const files = [
  ...SCAN_DIRS.flatMap((d) => [...walk(join(root, d))]),
  ...SCAN_FILES.map((f) => join(root, f)),
];

const hits = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { phrase, re } of patterns) {
      if (re.test(line)) {
        hits.push(`${relative(root, file)}:${i + 1}  →  "${phrase}"`);
      }
    }
  });
}

if (hits.length) {
  console.error(`lint:copy found ${hits.length} banned phrase(s):\n`);
  for (const h of hits) console.error('  ' + h);
  console.error('\nRewrite in plain words (see content/style/banned-phrases.txt).');
  process.exit(1);
}
console.log(`lint:copy clean — ${files.length} files checked against ${phrases.length} phrases`);
