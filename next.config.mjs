import bundleAnalyzer from '@next/bundle-analyzer';
import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';

const withMDX = createMDX();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/core/i18n/request.ts',
});

function getCanonicalAppUrl() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const fallbackAppUrl = 'http://localhost:3000';

  try {
    const url = new URL((configuredAppUrl || fallbackAppUrl).replace(/\/$/, ''));

    if (
      url.port === '3000' &&
      url.hostname !== 'localhost' &&
      url.hostname !== '127.0.0.1'
    ) {
      url.port = '';
    }

    return url;
  } catch {
    return new URL(fallbackAppUrl);
  }
}

function buildCanonicalRedirects() {
  const canonicalUrl = getCanonicalAppUrl();
  const redirects = [];
  const canonicalProtocol = canonicalUrl.protocol.replace(/:$/, '');
  const canonicalHost = canonicalUrl.host;
  const canonicalHostname = canonicalUrl.hostname;
  const alternateHostname = canonicalHostname.startsWith('www.')
    ? canonicalHostname.slice(4)
    : `www.${canonicalHostname}`;

  if (canonicalProtocol === 'https') {
    redirects.push({
      source: '/:path*',
      has: [
        {
          type: 'header',
          key: 'x-forwarded-proto',
          value: 'http',
        },
      ],
      destination: `https://${canonicalHost}/:path*`,
      permanent: true,
      basePath: false,
      locale: false,
    });
  }

  if (
    canonicalHostname !== 'localhost' &&
    canonicalHostname !== '127.0.0.1' &&
    alternateHostname !== canonicalHostname
  ) {
    redirects.push({
      source: '/:path*',
      has: [
        {
          type: 'host',
          value: alternateHostname,
        },
      ],
      destination: `${canonicalUrl.origin}/:path*`,
      permanent: true,
      basePath: false,
      locale: false,
    });
  }

  return redirects;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  reactStrictMode: false,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    qualities: [60, 70, 75],
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return buildCanonicalRedirects();
  },
  async rewrites() {
    return [
      {
        source: '/video/:path*',
        destination: '/api/static/video/:path*',
      },
      {
        source: '/pic/:path*',
        destination: '/api/static/pic/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/imgs/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      // fs: {
      //   browser: './empty.ts', // We recommend to fix code imports before using this method
      // },
    },
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    // Disable mdxRs for Vercel deployment compatibility with fumadocs-mdx
    ...(process.env.VERCEL ? {} : { mdxRs: true }),
  },
  reactCompiler: true,
};

export default withBundleAnalyzer(withNextIntl(withMDX(nextConfig)));
