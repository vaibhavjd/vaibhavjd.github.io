import type { APIRoute } from 'astro';
import { allRoutes, routeLastmod } from '@lib/data';
import { urlsetXml, xmlResponse } from '@lib/sitemap';

export const GET: APIRoute = () => {
  const entries = allRoutes()
    .filter((r) => r.kind === 'city-hub' || r.kind === 'fbc')
    .map((r) => ({ path: `/${r.slug}/`, lastmod: routeLastmod(r) }));
  return xmlResponse(urlsetXml(entries));
};
