// Loads the published dataset (committed by diag-pipeline) and derives
// everything the templates need. All prices flow through enrich() so the
// "total payable" logic lives in exactly one place.

import citiesJson from '@data/published/cities.json';
import providersJson from '@data/published/providers.json';
import testsJson from '@data/published/tests.json';
import panelsJson from '@data/published/panels.json';
import offersJson from '@data/published/offers.json';
import packagesJson from '@data/published/packages.json';
import reviewsJson from '@data/published/reviews.json';
import metaJson from '@data/published/meta.json';

import type {
  City,
  CoverageRow,
  DataMeta,
  EnrichedOffer,
  Offer,
  PackageCard,
  PackageDef,
  Panel,
  Provider,
  ReviewAggregate,
  TestDef,
} from './types';

export const cities = citiesJson as City[];
export const tests = testsJson as TestDef[];
export const panels = panelsJson as Panel[];
export const meta = metaJson as DataMeta;

const providerList = providersJson as Provider[];
const offers = offersJson as Offer[];
const packages = packagesJson as PackageDef[];
const reviews = reviewsJson as ReviewAggregate[];

export const providers: Record<string, Provider> = Object.fromEntries(
  providerList.map((p) => [p.slug, p]),
);
export const panelsBySlug: Record<string, Panel> = Object.fromEntries(
  panels.map((p) => [p.slug, p]),
);
export const testsBySlug: Record<string, TestDef> = Object.fromEntries(
  tests.map((t) => [t.slug, t]),
);
export const citiesBySlug: Record<string, City> = Object.fromEntries(
  cities.map((c) => [c.slug, c]),
);

// Minimum distinct providers before a comparison page earns its existence.
export const PROVIDER_GATE = 3;

// ---- ratings ----

export function ratingFor(
  providerSlug: string,
  citySlug: string,
): EnrichedOffer['rating'] {
  const google = reviews.find(
    (r) => r.provider === providerSlug && r.source === 'google' && r.city === citySlug,
  );
  if (google) return { rating: google.rating, count: google.count, source: 'Google' };
  const play = reviews.find(
    (r) => r.provider === providerSlug && r.source === 'play' && r.city === null,
  );
  if (play) return { rating: play.rating, count: play.count, source: 'Play Store' };
  const appstore = reviews.find(
    (r) => r.provider === providerSlug && r.source === 'appstore' && r.city === null,
  );
  if (appstore) return { rating: appstore.rating, count: appstore.count, source: 'App Store' };
  return null;
}

// ---- price derivation ----

export function enrich(offer: Offer): EnrichedOffer {
  const provider = providers[offer.provider];
  const freeAbove = offer.free_collection_above;
  const appliedCollectionFee =
    freeAbove !== null && offer.price >= freeAbove ? 0 : offer.collection_fee;
  const otherFeesTotal = offer.other_fees.reduce((s, f) => s + f.amount, 0);
  const couponOff = offer.coupon?.off_inr ?? 0;
  const total = offer.price + appliedCollectionFee + otherFeesTotal - couponOff;
  return {
    offer,
    provider,
    appliedCollectionFee,
    otherFeesTotal,
    couponOff,
    total,
    savingsVsMrp: Math.max(0, offer.mrp - total),
    rating: ratingFor(offer.provider, offer.city),
  };
}

function byTotal(a: EnrichedOffer, b: EnrichedOffer): number {
  return a.total - b.total;
}

// ---- test × city ----

export function testOffers(testSlug: string, citySlug: string): EnrichedOffer[] {
  return offers
    .filter((o) => o.kind === 'test' && o.test === testSlug && o.city === citySlug)
    .map(enrich)
    .sort(byTotal);
}

export interface TestCityInsights {
  n: number;
  min: number;
  max: number;
  cheapest: EnrichedOffer;
  cheapestNabl: EnrichedOffer | null;
  fastest: EnrichedOffer;
  freeCollectionCount: number;
}

export function insightsFor(rows: EnrichedOffer[]): TestCityInsights | null {
  if (rows.length === 0) return null;
  const cheapestNabl = rows.find((r) => r.provider.nabl) ?? null;
  const fastest = [...rows].sort((a, b) => a.offer.tat_hours - b.offer.tat_hours)[0];
  return {
    n: rows.length,
    min: rows[0].total,
    max: rows[rows.length - 1].total,
    cheapest: rows[0],
    cheapestNabl,
    fastest,
    freeCollectionCount: rows.filter((r) => r.appliedCollectionFee === 0).length,
  };
}

// ---- full-body checkup × city ----

export function packageCards(citySlug: string): PackageCard[] {
  const cards: PackageCard[] = [];
  for (const offer of offers) {
    if (offer.kind !== 'package' || offer.city !== citySlug) continue;
    const pkg = packages.find((p) => p.id === offer.package_id);
    if (!pkg) continue;
    const verifiedParams =
      pkg.panels.reduce((sum, slug) => sum + (panelsBySlug[slug]?.params.length ?? 0), 0) +
      (pkg.biomarkers?.length ?? 0);
    const enriched = enrich(offer);
    cards.push({
      pkg,
      enriched,
      verifiedParams,
      pricePerParam: verifiedParams > 0 ? enriched.total / verifiedParams : 0,
    });
  }
  return cards.sort((a, b) => a.enriched.total - b.enriched.total);
}

export function coverageRows(cards: PackageCard[]): CoverageRow[] {
  const slugs = new Set<string>();
  for (const c of cards) for (const s of c.pkg.panels) slugs.add(s);
  const rows: CoverageRow[] = panels
    .filter((p) => slugs.has(p.slug))
    .map((panel) => ({
      panel,
      included: cards.map((c) => c.pkg.panels.includes(panel.slug)),
    }));

  // Standalone biomarkers get their own single-parameter rows. Without this a
  // package that includes only vitamin D would either vanish from the matrix
  // or, worse, be shown as covering the whole vitamins panel.
  const singles = new Map<string, string>();
  for (const c of cards) {
    for (const entry of c.pkg.biomarkers ?? []) {
      const [slug, name] = entry.split('|');
      if (!singles.has(slug)) singles.set(slug, name ?? slug);
    }
  }
  for (const [slug, name] of singles) {
    rows.push({
      panel: { slug, name, params: [name] },
      included: cards.map((c) =>
        (c.pkg.biomarkers ?? []).some((b) => b.split('|')[0] === slug),
      ),
    });
  }
  return rows;
}

// ---- national ----

export function nationalRange(testSlug: string): { min: number; max: number; n: number } | null {
  const rows = offers
    .filter((o) => o.kind === 'test' && o.test === testSlug)
    .map(enrich);
  if (rows.length === 0) return null;
  const totals = rows.map((r) => r.total);
  return { min: Math.min(...totals), max: Math.max(...totals), n: rows.length };
}

export function cityRangesFor(
  testSlug: string,
): Array<{ city: City; min: number; n: number }> {
  return cities
    .map((city) => {
      const rows = testOffers(testSlug, city.slug);
      if (rows.length < PROVIDER_GATE) return null;
      return { city, min: rows[0].total, n: rows.length };
    })
    .filter((x): x is { city: City; min: number; n: number } => x !== null);
}

// ---- routes ----

export type PageKind = 'city-hub' | 'fbc' | 'test-city' | 'test-national';

export interface RouteDef {
  slug: string;
  kind: PageKind;
  citySlug?: string;
  testSlug?: string;
}

export const hubSlug = (citySlug: string) => `lab-tests-in-${citySlug}`;
export const fbcSlug = (citySlug: string) => `full-body-checkup-in-${citySlug}`;
export const testCitySlug = (testSlug: string, citySlug: string) =>
  `${testSlug}-test-in-${citySlug}`;
export const testNationalSlug = (testSlug: string) => `${testSlug}-test`;

let routesCache: RouteDef[] | null = null;

/** Every generated comparison route, publish gate applied. Reused by
 *  getStaticPaths and the sitemap endpoints so they can never disagree.
 *  Memoised — it walks the full offer set once per build. */
export function allRoutes(): RouteDef[] {
  if (routesCache) return routesCache;
  const routes: RouteDef[] = [];
  for (const city of cities) {
    routes.push({ slug: hubSlug(city.slug), kind: 'city-hub', citySlug: city.slug });
    if (packageCards(city.slug).length >= PROVIDER_GATE) {
      routes.push({ slug: fbcSlug(city.slug), kind: 'fbc', citySlug: city.slug });
    }
  }
  for (const test of tests) {
    // National guide pages need at least one live price behind them.
    if (nationalRange(test.slug) !== null) {
      routes.push({ slug: testNationalSlug(test.slug), kind: 'test-national', testSlug: test.slug });
    }
    for (const city of cities) {
      const rows = testOffers(test.slug, city.slug);
      const distinct = new Set(rows.map((r) => r.offer.provider)).size;
      if (distinct >= PROVIDER_GATE) {
        routes.push({
          slug: testCitySlug(test.slug, city.slug),
          kind: 'test-city',
          citySlug: city.slug,
          testSlug: test.slug,
        });
      }
    }
  }
  routesCache = routes;
  return routes;
}

/** Tests that actually have a published page in this city. Link modules must
 *  use this — linking to a page the publish gate removed creates a 404. */
export function publishedTestsIn(citySlug: string): TestDef[] {
  const slugs = new Set(
    allRoutes()
      .filter((r) => r.kind === 'test-city' && r.citySlug === citySlug)
      .map((r) => r.testSlug),
  );
  return tests.filter((t) => slugs.has(t.slug));
}

/** Cities where this test has a published page. */
export function publishedCitiesFor(testSlug: string): City[] {
  const slugs = new Set(
    allRoutes()
      .filter((r) => r.kind === 'test-city' && r.testSlug === testSlug)
      .map((r) => r.citySlug),
  );
  return cities.filter((c) => slugs.has(c.slug));
}

/** Newest last_verified across a set of offers — feeds sitemap lastmod. */
export function lastVerifiedOf(rows: EnrichedOffer[]): string {
  const dates = rows.map((r) => r.offer.last_verified).sort();
  return dates[dates.length - 1] ?? meta.generated_at.slice(0, 10);
}

function newestDate(list: Offer[]): string {
  const dates = list.map((o) => o.last_verified).sort();
  return dates[dates.length - 1] ?? meta.generated_at.slice(0, 10);
}

/** lastmod for a route = when its underlying data last changed, not when the
 *  site was last built. Sitemaps read this. */
export function routeLastmod(r: RouteDef): string {
  if (r.kind === 'test-city' && r.testSlug && r.citySlug) {
    return newestDate(
      offers.filter((o) => o.kind === 'test' && o.test === r.testSlug && o.city === r.citySlug),
    );
  }
  if (r.kind === 'fbc' && r.citySlug) {
    return newestDate(offers.filter((o) => o.kind === 'package' && o.city === r.citySlug));
  }
  if (r.kind === 'city-hub' && r.citySlug) {
    return newestDate(offers.filter((o) => o.city === r.citySlug));
  }
  if (r.kind === 'test-national' && r.testSlug) {
    return newestDate(offers.filter((o) => o.kind === 'test' && o.test === r.testSlug));
  }
  return meta.generated_at.slice(0, 10);
}
