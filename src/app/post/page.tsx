import { townsWithCounts } from '@/core';
import { POST } from '@/core/copy';
import ui from '@/components/ui.module.css';
import { PostForm } from './PostForm';
import styles from './post.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'List a room',
  description: 'Agents and landlords: list a room on HomeGuy, free, reviewed by a person.',
};

/**
 * /post. The Tier 1 channel: an agent or landlord lists directly. It is the
 * source that needs nobody else's permission, and the only one where the
 * advance term — the product's headline number — usually arrives at all.
 */
export default async function PostPage() {
  const towns = (await townsWithCounts())
    .map((t) => ({ slug: t.slug, name: t.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <h1 className={ui.h2}>{POST.title}</h1>
      <p className={ui.body}>{POST.intro}</p>
      <PostForm towns={towns} />
    </div>
  );
}
