/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig


