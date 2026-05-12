/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@deep2k/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
