import type { APIRoute } from 'astro';
import { meta } from '@lib/data';
import { indexXml, xmlResponse } from '@lib/sitemap';

export const GET: APIRoute = () => {
  const today = meta.generated_at.slice(0, 10);
  return xmlResponse(
    indexXml([
      { path: '/sitemap-core.xml', lastmod: today },
      { path: '/sitemap-cities.xml', lastmod: today },
      { path: '/sitemap-tests.xml', lastmod: today },
    ]),
  );
};
