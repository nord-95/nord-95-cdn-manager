/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['pub-a7677751318d428a9d7c43faab7f3d7d.r2.dev']
  },
  output: 'standalone',
  swcMinify: true,
  experimental: {
    esmExternals: false
  },
  webpack: (config, { isServer }) => {
    // Force compatibility mode
    config.target = isServer ? 'node' : 'web'
    return config
  }
}

module.exports = nextConfig
