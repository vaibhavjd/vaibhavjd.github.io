// Data-derived FAQs for test×city pages. Every answer is built from live
// numbers, so no two city pages answer alike.

import type { TestCityInsights } from './data';
import type { City, TestDef } from './types';
import { formatINR, formatTat, formatDate } from './format';

export function testCityFaqs(
  test: TestDef,
  city: City,
  s: TestCityInsights,
  updated: string,
): Array<{ q: string; a: string }> {
  const faqs = [
    {
      q: `How much does a ${test.short} test cost in ${city.name}?`,
      a: `${formatINR(s.min)} to ${formatINR(s.max)} across ${s.n} labs as of ${formatDate(updated)}, including home-collection charges and current coupon codes.`,
    },
    {
      q: `Which lab has the cheapest ${test.short} test in ${city.name}?`,
      a: `${s.cheapest.provider.name} at ${formatINR(s.cheapest.total)} all-in right now.${
        s.cheapestNabl && s.cheapestNabl.offer.id !== s.cheapest.offer.id
          ? ` If you want a NABL-accredited lab specifically, ${s.cheapestNabl.provider.name} is the cheapest at ${formatINR(s.cheapestNabl.total)}.`
          : ''
      }`,
    },
    {
      q: `Is free home sample collection available for ${test.short} in ${city.name}?`,
      a:
        s.freeCollectionCount > 0
          ? `Yes — ${s.freeCollectionCount} of ${s.n} labs listed here collect at home for free. The rest charge roughly ₹49–150, which our total already includes.`
          : `Most labs here charge a home-collection fee of roughly ₹49–150. Our totals include it, so there's no surprise at checkout.`,
    },
    {
      q: `How fast can I get a ${test.short} report in ${city.name}?`,
      a: `${s.fastest.provider.name} is quickest at ${formatTat(s.fastest.offer.tat_hours)}. ${
        test.fasting_hours > 0
          ? `Remember this test needs ${test.fasting_hours} hours of fasting, so book a morning slot.`
          : `No fasting is needed, so you can book any slot.`
      }`,
    },
  ];
  return faqs;
}
