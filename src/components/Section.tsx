import ui from './ui.module.css';
import styles from './Section.module.css';

/**
 * A goal-named, collapsible detail section.
 *
 * Pass 1 - Search and Results.dc.html:519 names these by what the renter is
 * trying to find out - "What you'd pay", "Who's listing it", "What's not
 * stated" - rather than by field group. It uses <details>, so it collapses
 * and expands with no JavaScript at all and is keyboard-operable for free.
 */
export function Section({
  title,
  sub,
  defaultOpen = false,
  emphasis = false,
  children,
}: {
  title: string;
  sub: string;
  defaultOpen?: boolean;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className={styles.section} open={defaultOpen}>
      <summary className={styles.summary}>
        <span className={styles.title}>{title}</span>
        <span className={emphasis ? `${ui.caption} ${styles.emphasis} num` : `${ui.caption} num`}>
          {sub}
        </span>
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
