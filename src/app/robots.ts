const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // If there were private areas we would disallow them here.
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
