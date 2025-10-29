import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

// Use simple console output in development to avoid worker thread issues in Next.js
export const logger = pino({
  level: isProd ? 'info' : 'debug',
  browser: {
    asObject: true,
  },
});
