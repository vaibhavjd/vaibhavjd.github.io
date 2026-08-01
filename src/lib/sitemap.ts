import { absUrl } from './seo';

export interface SitemapEntry {
  path: string;
  lastmod: string;
}

export function urlsetXml(entries: SitemapEntry[]): string {
  const rows = entries
    .map(
      (e) =>
        `  <url><loc>${absUrl(e.path)}</loc><lastmod>${e.lastmod}</lastmod></url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

export function indexXml(children: Array<{ path: string; lastmod: string }>): string {
  const rows = children
    .map(
      (c) =>
        `  <sitemap><loc>${absUrl(c.path)}</loc><lastmod>${c.lastmod}</lastmod></sitemap>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</sitemapindex>\n`;
}

export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
