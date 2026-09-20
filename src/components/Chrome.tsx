'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { useShortlist } from '@/lib/shortlist';
import { NAV } from '@/core/copy';
import styles from './Chrome.module.css';

const ITEMS = [
  { href: '/search', key: 'search', label: NAV.search },
  { href: '/saved', key: 'saved', label: NAV.saved },
  { href: '/digest', key: 'digest', label: NAV.digest },
  { href: '/me', key: 'me', label: NAV.me },
] as const;

function isOn(pathname: string, key: string): boolean {
  if (key === 'search') return pathname === '/search' || pathname.startsWith('/place');
  if (key === 'saved') {
    return pathname === '/saved' || pathname === '/discarded' || pathname === '/compare';
  }
  return pathname === `/${key}`;
}

/** Desktop top bar. Hidden on the start flow, which owns the whole screen. */
export function TopBar() {
  const pathname = usePathname();
  const { saved } = useShortlist();
  if (pathname === '/start') return null;

  return (
    <header className={styles.top}>
      <div className={styles.topInner}>
        <Link href="/" className={styles.brand}>
          <Logo size={22} />
          <span className={styles.wordmark}>HomeGuy</span>
        </Link>
        <div className={styles.spacer} />
        <nav aria-label="Main">
          <ul className={styles.navList}>
            {ITEMS.map((item) => {
              const on = isOn(pathname, item.key);
              const label =
                item.key === 'saved' && saved.length > 0
                  ? NAV.savedWithCount(saved.length)
                  : item.label;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={on ? `${styles.navItem} ${styles.navItemOn}` : styles.navItem}
                    aria-current={on ? 'page' : undefined}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/** Mobile tab bar. Web.dc.html:1016-1038 */
export function TabBar() {
  const pathname = usePathname();
  const { saved } = useShortlist();
  if (pathname === '/start') return null;

  return (
    <nav className={styles.tabBar} aria-label="Sections">
      {ITEMS.map((item) => {
        const on = isOn(pathname, item.key);
        const label =
          item.key === 'saved' && saved.length > 0
            ? NAV.savedWithCount(saved.length)
            : item.label;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={on ? `${styles.tab} ${styles.tabOn}` : styles.tab}
            aria-current={on ? 'page' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
