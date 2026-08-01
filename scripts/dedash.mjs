// Rewrites em/en dashes out of user-facing copy. Deliberately conservative:
// it replaces ONLY the dash characters and the spaces immediately around them.
// It never reflows or collapses whitespace, so source formatting is untouched.
//
//   node scripts/dedash.mjs           preview every rewrite
//   node scripts/dedash.mjs --write   apply
//
// Scope: prose strings in tests.json plus visible copy in .astro/.tsx files.
// A previous version of this script collapsed all runs of whitespace and
// flattened 15 files onto single lines. Do not reintroduce a \s{2,} rule.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const EM = '—';
const EN = '–';

/** Sentence-safe: a long independent clause becomes its own sentence, a short
 *  trailing fragment becomes a comma clause. */
export function fixProse(text) {
  let out = text;

  // Ranges read best as "to": "10–12 hours", "₹200–₹450", "5.7–6.4%".
  out = out.replace(
    new RegExp(`([\\d%\\u20B9])\\s*${EN}\\s*(\\u20B9?\\d)`, 'g'),
    '$1 to $2',
  );
  out = out.replace(new RegExp(`\\s*${EN}\\s*`, 'g'), ', ');

  // A PAIR of em-dashes inside one sentence is a parenthetical aside. Turning
  // both into commas produces "you share there, name, address, reports, never
  // passes through us", so they become real parentheses instead.
  out = out
    .split(/(?<=[.!?])(\s)/)
    .map((part) => {
      if ((part.match(new RegExp(EM, 'g')) || []).length < 2) return part;
      let seen = 0;
      return part.replace(new RegExp(`\\s*${EM}\\s*`, 'g'), () => {
        seen += 1;
        if (seen === 1) return ' (';
        if (seen === 2) return ') ';
        return ', ';
      });
    })
    .join('');

  out = out.replace(new RegExp(`\\s*${EM}\\s*`, 'g'), (_m, offset, full) => {
    const rest = full.slice(offset).replace(new RegExp(`^\\s*${EM}\\s*`), '');
    const clause = rest.split(/(?<=[.!?])\s/)[0] ?? rest;
    // Long clause with its own verb reads as a sentence; else a comma.
    return clause.length > 45 ? '. ' : ', ';
  });

  // Capitalise only where we just introduced a sentence break.
  out = out.replace(/\. ([a-z])/g, (m, c, off, s) => {
    const before = s.slice(Math.max(0, off - 5), off);
    if (/\b(e\.g|i\.e|vs|Dr|no|approx)$/i.test(before)) return m;
    return '. ' + c.toUpperCase();
  });

  return out;
}

const TARGET_EXT = new Set(['.astro', '.tsx']);
const SKIP = /node_modules|dist|\.astro[\\/]/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (SKIP.test(full)) continue;
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (TARGET_EXT.has(full.slice(full.lastIndexOf('.')))) yield full;
  }
}

let changed = 0;

// tests.json: rewrite string VALUES only, preserving structure and key order.
const testsPath = join(root, 'data', 'published', 'tests.json');
{
  const original = readFileSync(testsPath, 'utf8');
  const walkJson = (n) =>
    typeof n === 'string'
      ? fixProse(n)
      : Array.isArray(n)
        ? n.map(walkJson)
        : n && typeof n === 'object'
          ? Object.fromEntries(Object.entries(n).map(([k, v]) => [k, walkJson(v)]))
          : n;
  const updated = JSON.stringify(walkJson(JSON.parse(original)), null, 2) + '\n';
  if (updated !== original) {
    changed++;
    console.log('tests.json rewritten');
    if (WRITE) writeFileSync(testsPath, updated, 'utf8');
  }
}

// Source files: rewrite dashes in place, line by line, so nothing reflows.
for (const file of walk(join(root, 'src'))) {
  const original = readFileSync(file, 'utf8');
  if (!original.includes(EM) && !original.includes(EN)) continue;
  const updated = original
    .split('\n')
    .map((line) => fixProse(line))
    .join('\n');
  if (updated !== original) {
    changed++;
    console.log(`${relative(root, file)}`);
    if (WRITE) writeFileSync(file, updated, 'utf8');
  }
}

console.log(`\n${changed} file(s) ${WRITE ? 'rewritten' : 'would change'}`);
