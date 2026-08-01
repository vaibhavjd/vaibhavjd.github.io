import type { APIRoute } from 'astro';
import { allRoutes, routeLastmod } from '@lib/data';
import { urlsetXml, xmlResponse } from '@lib/sitemap';

export const GET: APIRoute = () => {
  const entries = allRoutes()
    .filter((r) => r.kind === 'test-city' || r.kind === 'test-national')
    .map((r) => ({ path: `/${r.slug}/`, lastmod: routeLastmod(r) }));
  return xmlResponse(urlsetXml(entries));
};
