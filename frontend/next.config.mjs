/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  eslint: {
    dirs: ['app', 'components', 'lib']
  }
}

export default nextConfig
