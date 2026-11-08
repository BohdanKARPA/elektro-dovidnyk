import type { NextConfig } from 'next'

/**
 * Security headers (OWASP A05 Security Misconfiguration).
 * The public site gets a strict Content-Security-Policy; the Studio needs
 * to talk to *.sanity.io and run its own bundle, so it gets a wider one.
 */
const siteCsp = [
  "default-src 'self'",
  // Next.js injects small inline bootstrap scripts; no third-party scripts are allowed.
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://cdn.sanity.io",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SITE_URL?.startsWith('http://') ? ['upgrade-insecure-requests'] : []),
].join('; ')

const studioCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sanity.io",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.sanity.io https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.sanity.io wss://*.sanity.io",
  "frame-src 'self' https://*.sanity.io",
  "frame-ancestors 'self'",
  "object-src 'none'",
].join('; ')

const common = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
  async headers() {
    return [
      {
        source: '/((?!studio).*)',
        headers: [...common, { key: 'Content-Security-Policy', value: siteCsp }, { key: 'X-Frame-Options', value: 'DENY' }],
      },
      {
        source: '/studio/:path*',
        headers: [...common, { key: 'Content-Security-Policy', value: studioCsp }],
      },
    ]
  },
}

export default nextConfig
