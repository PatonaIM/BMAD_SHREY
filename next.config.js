/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverActions: {
    bodySizeLimit: '2mb'
  }
};
module.exports = nextConfig;
