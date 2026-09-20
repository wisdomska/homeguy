import type { MetadataRoute } from 'next';
import { REGIONS, TOWNS } from '@/core/repo';

const base = 'https://homeguy.vercel.app';

/**
 * Only the indexable surfaces. The shortlist, discard bucket, compare table
 * and settings are per-person and are excluded here and in robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/start`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/bot`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    ...REGIONS.map((r) => ({
      url: `${base}/rent/${r.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...TOWNS.map((t) => ({
      url: `${base}/rent/${t.regionId}/${t.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];
}
