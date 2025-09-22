/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['firebase-admin'],
  images: {
    domains: ['pub-a7677751318d428a9d7c43faab7f3d7d.r2.dev']
  },
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin']
  }
}

module.exports = nextConfig
