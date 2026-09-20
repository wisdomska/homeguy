import type { MetadataRoute } from 'next';

/**
 * Preview and staging deployments are disallowed outright. An indexed
 * staging copy of a listings site is a real SEO problem, not a theoretical
 * one - duplicate inventory, split authority, and stale prices outranking
 * live ones.
 *
 * The X-Robots-Tag: noindex header in next.config.ts covers the same ground
 * for anything a crawler reaches without reading robots.txt.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === 'production';

  if (!isProduction) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/compare', '/saved', '/discarded', '/me'],
      },
    ],
    sitemap: 'https://homeguy.vercel.app/sitemap.xml',
    host: 'https://homeguy.vercel.app',
  };
}
