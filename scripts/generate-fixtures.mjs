// Generates SAMPLE offers/packages/reviews for staging (data_mode: "fixture").
// Deterministic: same inputs → same JSON, so builds are reproducible.
// The diag-pipeline export replaces these files with scraped data in the
// exact same shape; the site cannot tell the difference except via meta.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'published');
const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const write = (f, data) =>
  writeFileSync(join(dir, f), JSON.stringify(data, null, 2) + '\n', 'utf8');

const cities = read('cities.json');
const providers = read('providers.json');
const tests = read('tests.json');

// ---- seeded PRNG (mulberry32 over a string hash) ----
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CITY_FACTOR = {
  mumbai: 1.1, delhi: 1.08, bengaluru: 1.06, hyderabad: 1.0, chennai: 1.0,
  kolkata: 0.95, pune: 1.0, ahmedabad: 0.95, jaipur: 0.9, lucknow: 0.88,
};
const COUPONS = [
  { code: 'WELCOME100', kind: 'flat', value: 100 },
  { code: 'HEALTH10', kind: 'pct', value: 10 },
  { code: 'FIRST15', kind: 'pct', value: 15 },
];
const round10 = (n) => Math.max(50, Math.round(n / 10) * 10 - 1);

function offerBase(r, provider, price) {
  const coupon =
    r() < 0.35
      ? (() => {
          const c = COUPONS[Math.floor(r() * COUPONS.length)];
          const off = c.kind === 'flat' ? c.value : Math.round((price * c.value) / 100);
          return { code: c.code, off_inr: Math.min(off, Math.round(price * 0.25)) };
        })()
      : null;
  const other_fees =
    provider.kind === 'online_aggregator' && r() < 0.3
      ? [{ label: 'Platform fee', amount: 30 }]
      : [];
  const daysAgo = Math.floor(r() * 10);
  const verified = new Date(Date.UTC(2026, 6, 31) - daysAgo * 864e5)
    .toISOString()
    .slice(0, 10);
  return {
    mrpMult: 1.2 + r() * 0.5,
    coupon,
    other_fees,
    last_verified: verified,
    slot: provider.express_minutes
      ? 'express-60'
      : r() < 0.6
        ? 'same-day'
        : 'next-morning',
  };
}

// ---- test offers ----
const offers = [];
for (const test of tests) {
  for (const city of cities) {
    for (const provider of providers) {
      const r = rng(`${test.slug}|${city.slug}|${provider.slug}`);
      // ~75% of provider×test×city cells have an offer.
      if (r() < 0.25) continue;
      const [lo, hi] = test.band;
      const price = round10((lo + r() * (hi - lo)) * (CITY_FACTOR[city.slug] ?? 1));
      const base = offerBase(r, provider, price);
      const [tlo, thi] = test.tat_hours;
      const speed = provider.express_minutes ? 0.15 : r();
      offers.push({
        id: `t-${test.slug}-${city.slug}-${provider.slug}`,
        provider: provider.slug,
        city: city.slug,
        kind: 'test',
        test: test.slug,
        mrp: round10(price * base.mrpMult),
        price,
        coupon: base.coupon,
        collection_fee: provider.home_collection.fee_inr,
        free_collection_above: provider.home_collection.free_above_inr,
        other_fees: base.other_fees,
        tat_hours: Math.round(tlo + speed * (thi - tlo)),
        earliest_slot: base.slot,
        report_modes: ['app', 'email', 'whatsapp'],
        last_verified: base.last_verified,
        source_url: provider.booking_url,
      });
    }
  }
}

// ---- packages + their per-city offers ----
const packages = [];
for (const provider of providers) {
  provider.fbc_templates.forEach((tpl, i) => {
    const id = `${provider.slug}-fbc-${i + 1}`;
    packages.push({
      id,
      provider: provider.slug,
      name: tpl.name,
      claimed_params: tpl.claimed_params,
      panels: tpl.panels,
      consult_included: tpl.consult_included,
      smart_report: tpl.smart_report,
      fasting_required: true,
      gender: 'any',
      tat_hours: 24,
    });
    for (const city of cities) {
      const r = rng(`pkg|${id}|${city.slug}`);
      if (r() < 0.15) continue;
      const perParam = 11 + r() * 8; // ₹11–19 per parameter
      const price = round10(
        tpl.claimed_params * perParam * (CITY_FACTOR[city.slug] ?? 1),
      );
      const base = offerBase(r, provider, price);
      offers.push({
        id: `p-${id}-${city.slug}`,
        provider: provider.slug,
        city: city.slug,
        kind: 'package',
        package_id: id,
        mrp: round10(price * base.mrpMult),
        price,
        coupon: base.coupon,
        collection_fee: provider.home_collection.fee_inr,
        free_collection_above: provider.home_collection.free_above_inr,
        other_fees: base.other_fees,
        tat_hours: provider.express_minutes ? 12 : 24,
        earliest_slot: base.slot,
        report_modes: ['app', 'email', 'whatsapp'],
        last_verified: base.last_verified,
        source_url: provider.booking_url,
      });
    }
  });
}

// ---- review aggregates ----
const reviews = [];
for (const provider of providers) {
  for (const city of cities) {
    const r = rng(`rev|${provider.slug}|${city.slug}`);
    reviews.push({
      provider: provider.slug,
      city: city.slug,
      source: 'google',
      rating: Math.round((36 + r() * 12) ) / 10,
      count: 400 + Math.floor(r() * 24000),
      fetched_at: '2026-07-28',
      ref: `fixture-place-${provider.slug}-${city.slug}`,
    });
  }
  const r = rng(`rev|${provider.slug}|apps`);
  reviews.push({
    provider: provider.slug,
    city: null,
    source: 'play',
    rating: Math.round((38 + r() * 10)) / 10,
    count: 5000 + Math.floor(r() * 350000),
    fetched_at: '2026-07-28',
    ref: `fixture-play-${provider.slug}`,
  });
  reviews.push({
    provider: provider.slug,
    city: null,
    source: 'appstore',
    rating: Math.round((38 + r() * 10)) / 10,
    count: 500 + Math.floor(r() * 30000),
    fetched_at: '2026-07-28',
    ref: `fixture-ios-${provider.slug}`,
  });
}

write('offers.json', offers);
write('packages.json', packages);
write('reviews.json', reviews);
write('meta.json', {
  generated_at: '2026-08-01T00:00:00.000Z',
  data_mode: 'fixture',
  changed_urls: [],
});

console.log(
  `fixtures: ${offers.length} offers, ${packages.length} packages, ${reviews.length} review aggregates`,
);
