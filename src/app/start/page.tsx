import { StartFlow } from '@/components/StartFlow';
import { totalClusterCount, townsWithCounts, regionsWithCoverage } from '@/core';

export const revalidate = 300;

export const metadata = {
  title: 'Work out what you can actually raise',
};

/**
 * START FLOW. Web.dc.html:143-237 and Pass 1:1949-2188.
 *
 * Three steps: what you can pay a month, the lump sum you can raise, then
 * where. The order is deliberate - the lump sum is the number that decides
 * the deal, and asking for it second means the consequence line can be
 * specific ("Reaches 38 of the 486 rooms at GH¢800 a month") instead of
 * abstract.
 */
export default async function StartPage() {
  const [total, towns, regions] = await Promise.all([
    totalClusterCount(),
    townsWithCounts(),
    regionsWithCoverage(),
  ]);
  return (
    <StartFlow
      total={total}
      towns={towns.map((t) => ({
        slug: t.slug,
        name: t.name,
        sub: t.sub,
        count: t.count,
        regionSlug: t.regionId,
      }))}
      regions={regions.map((r) => ({
        slug: r.slug,
        name: r.name,
        count: r.count,
      }))}
    />
  );
}
