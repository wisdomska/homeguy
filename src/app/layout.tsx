import type { Metadata, Viewport } from 'next';
import { TabBar, TopBar } from '@/components/Chrome';
import { ServiceWorker } from '@/components/ServiceWorker';
import { BRAND } from '@/core/tokens';
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
      </body>
    </html>
  );
}
