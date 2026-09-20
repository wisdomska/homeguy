import type { NextConfig } from 'next';

/** Preview and staging must never be indexed. Production only. */
const isProduction = process.env.VERCEL_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { formats: ['image/webp'] },
  experimental: { optimizePackageImports: [] },
  async headers() {
    const headers = [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
    if (!isProduction) {
      headers.push({
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      });
    }
    return headers;
  },
};

export default nextConfig;
