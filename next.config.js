/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  // Suppress React DevTools version check errors with @react-three/fiber
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ignore React DevTools backend errors in development
      config.resolve.alias = {
        ...config.resolve.alias,
        'react-devtools-core': false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        // Apply security headers and allow camera/microphone on all pages
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), display-capture=(self)',
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
