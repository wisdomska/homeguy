import Link from 'next/link';
import { BOT_USER_AGENT, DENYLIST, MIN_HOST_INTERVAL_MS, SOURCE_CONFIG } from '@/ingest/config';
import ui from '@/components/ui.module.css';
import styles from '../rent/[region]/rent.module.css';

export const dynamic = 'force-static';

export const metadata = {
  title: 'HomeGuyBot',
  description:
    'What HomeGuyBot is, what it fetches, how often, and how to ask it to stop.',
};

/**
 * The page our User-Agent string points at. If a bot identifies itself with
 * a URL, that URL has to be live and has to actually say how to opt out -
 * otherwise the honest identification is theatre.
 */
export default function BotPage() {
  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <h1 className={ui.h1}>HomeGuyBot</h1>

      <p className={ui.body}>
        HomeGuy is a search layer for rental listings in Ghana. We hold no inventory, take no
        payment, and are never a counterparty to a tenancy. When we index a listing we keep
        the name of the source and a link back to the original, and we send readers there.
      </p>

      <h2 className={ui.h3}>How it identifies itself</h2>
      <pre className={ui.card}>
        <code>{BOT_USER_AGENT}</code>
      </pre>

      <h2 className={ui.h3}>What it does</h2>
      <ul className={ui.body}>
        <li>Reads your robots.txt before every run and caches it for no more than a day.</li>
        <li>Honours Disallow and Crawl-delay. If we cannot read robots.txt, we do not crawl.</li>
        <li>
          Makes one request at a time per host, at least {MIN_HOST_INTERVAL_MS / 1000} seconds
          apart, and backs off exponentially on 429 and 503.
        </li>
        <li>Stops entirely on a 403 and does not retry past it.</li>
        <li>
          Never fetches anything behind a login, a paywall or a CAPTCHA, and never attempts to
          solve one.
        </li>
        <li>Discovers pages from your sitemap, not by walking search results.</li>
        <li>
          Never stores an agent&apos;s name or phone number taken from a crawled page. Under
          Ghana&apos;s Data Protection Act, 2012 (Act 843) those are personal data, and that
          route gives us no lawful basis to hold them.
        </li>
      </ul>

      <h2 className={ui.h3}>How to stop it</h2>
      <p className={ui.body}>
        Add this to your robots.txt and we will stop on the next run, within 24 hours:
      </p>
      <pre className={ui.card}>
        <code>{`User-agent: HomeGuyBot\nDisallow: /`}</code>
      </pre>
      <p className={ui.body}>
        Or email us and we will switch your source off by hand the same day. We action
        takedown requests within 48 hours, and we will tell you what happened to yours.
      </p>

      <h2 className={ui.h3}>Sites we never fetch</h2>
      <p className={ui.caption}>
        These are refused in code, not by policy, so no configuration mistake can reach them:
      </p>
      <ul className={ui.caption}>
        {DENYLIST.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>

      <h2 className={ui.h3}>Sources, and whether they are on</h2>
      <ul className={ui.caption}>
        {SOURCE_CONFIG.map((s) => (
          <li key={s.id}>
            {s.name} — tier {s.tier}, {s.kind}, {s.enabled ? 'enabled' : 'switched off'}
          </li>
        ))}
      </ul>

      <p className={ui.caption}>
        Would rather send us a feed than be crawled? That is our preference too — it is
        cheaper for both of us and the data is better. <Link href="/me">Get in touch.</Link>
      </p>
    </div>
  );
}
