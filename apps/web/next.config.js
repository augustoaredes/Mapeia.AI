/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Cabeçalhos para o Service Worker e segurança
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control',   value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type',    value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',        value: 'DENY'    },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
