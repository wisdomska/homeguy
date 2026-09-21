import type { Metadata, Viewport } from 'next';
import { TabBar, TopBar } from '@/components/Chrome';
import { ServiceWorker } from '@/components/ServiceWorker';
import { BRAND } from '@/core/tokens';
import { Analytics } from '@vercel/analytics/next';
import '@/styles/globals.css';

const isProduction = process.env.VERCEL_ENV === 'production';

export const metadata: Metadata = {
  metadataBase: new URL(
    isProduction ? 'https://homeguy.vercel.app' : 'http://localhost:3000',
  ),
  title: {
    default: 'HomeGuy — every rental listing in Ghana, in one place',
    template: '%s · HomeGuy',
  },
  description:
    'Rental listings from portals, classifieds, Facebook groups and agent WhatsApp broadcasts, de-duplicated into one searchable index — with total cash to move in as a field you can filter on.',
  applicationName: 'HomeGuy',
  // Preview and staging are never indexed.
  robots: isProduction ? { index: true, follow: true } : { index: false, follow: false },
  icons: { icon: '/homeguy-logo.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: BRAND.page,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GH">
      <head>
        {/* The font is the only render-blocking asset, and it is ours. */}
        <link
          rel="preload"
          href="/fonts/space-grotesk-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to results
        </a>
        <TopBar />
        <main id="main">{children}</main>
        <TabBar />
        <ServiceWorker />
        {/*
          Production only, and cookieless, so no consent banner is needed.

          Speed Insights is deliberately NOT mounted. Measured on a real
          deployment, compressed: the analytics script is 1.57 KB and the
          speed-insights script is 4.64 KB, and the two npm wrappers add
          3.64 KB in-bundle. Both together are 10.70 KB, which is over
          double the 5 KB analytics budget.

          Analytics plus our own event beacon comes to 4.30 KB and fits.
          The beacon already carries every metric that actually decides
          this product — zero_results with its cause above all — and LCP
          on a throttled Moto-G-class device is measured in CI, which is
          where the brief wanted it measured anyway.

          See docs/BRAND-DEVIATIONS.md.
        */}
        {isProduction ? <Analytics /> : null}
      </body>
    </html>
  );
}
