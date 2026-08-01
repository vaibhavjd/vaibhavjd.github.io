import type { APIRoute } from 'astro';
import { absUrl } from '@lib/seo';

// Staging: block everything (plus every page carries noindex).
// Live: open, with the sitemap advertised.
export const GET: APIRoute = () => {
  const staging = import.meta.env.PUBLIC_STAGING !== 'false';
  const body = staging
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${absUrl('/sitemap-index.xml')}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
