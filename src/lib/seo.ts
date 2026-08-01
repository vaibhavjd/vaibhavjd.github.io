// JSON-LD builders. Every absolute URL derives from Astro's `site` config,
// which derives from PUBLIC_SITE_URL — the single lever for domain cutover.

import type { EnrichedOffer, TestDef } from './types';

const SITE = (import.meta.env.SITE ?? 'https://mylabtests.github.io').replace(/\/$/, '');

export const absUrl = (path: string) => `${SITE}${path.startsWith('/') ? path : `/${path}`}`;

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absUrl(c.path),
    })),
  };
}

export function faqLd(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function medicalTestLd(test: TestDef, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalTest',
    name: test.name,
    alternateName: test.aka,
    url: absUrl(path),
    usedToDiagnose: test.measures,
  };
}

export function medicalWebPageLd(title: string, path: string, lastVerified: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: title,
    url: absUrl(path),
    dateModified: lastVerified,
  };
}

/** ItemList of Offers for a comparison table. Deliberately NO aggregateRating
 *  anywhere — Google-sourced ratings render visually with attribution only. */
export function offerListLd(name: string, path: string, rows: EnrichedOffer[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url: absUrl(path),
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: `${name} — ${r.provider.name}`,
        offers: {
          '@type': 'Offer',
          price: r.total,
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          url: r.offer.source_url,
        },
      },
    })),
  };
}

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'My Lab Tests',
    url: absUrl('/'),
    slogan: 'Compare lab tests. Pay the right price.',
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'My Lab Tests',
    url: absUrl('/'),
  };
}
