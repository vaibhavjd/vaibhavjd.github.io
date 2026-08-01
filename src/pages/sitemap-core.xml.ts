import type { APIRoute } from 'astro';
import { meta } from '@lib/data';
import { urlsetXml, xmlResponse } from '@lib/sitemap';

export const GET: APIRoute = () => {
  const lastmod = meta.generated_at.slice(0, 10);
  const paths = ['/', '/about/', '/editorial-policy/', '/contact/', '/disclaimer/', '/privacy/', '/terms/'];
  return xmlResponse(urlsetXml(paths.map((path) => ({ path, lastmod }))));
};
