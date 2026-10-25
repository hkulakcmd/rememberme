/** @type {import('next').NextConfig} */
const backendUrl = (process.env.BACKEND_URL || 'http://localhost:8000').replace(
  /\/$/,
  ''
);

const isProduction = process.env.NODE_ENV === 'production';

// Third-party origins are needed for Google Identity Services and the
// Facebook JS SDK. Inline scripts/styles come from Next.js itself.
const contentSecurityPolicy = [
  "default-src 'self'",
  isProduction
    ? "script-src 'self' 'unsafe-inline' https://accounts.google.com https://connect.facebook.net https://staticxx.facebook.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://connect.facebook.net https://staticxx.facebook.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://accounts.google.com https://www.googleapis.com https://graph.facebook.com",
  "frame-src https://accounts.google.com https://www.facebook.com https://web.facebook.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  ...(isProduction
    ? [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    // Same-origin API: the browser calls /api/v1/*, Next.js proxies to Django.
    // Keeps JWT cookies first-party and avoids CORS (architecture.md §4).
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.js',
  swDest: 'public/sw.js',
  // Keep HMR fast and avoid caching development assets.
  disable: !isProduction,
  register: false,
  reloadOnOnline: true,
});

export default withSerwist(nextConfig);
