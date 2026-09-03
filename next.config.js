import withPWAInit from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // The APIs are auth-guarded and payment flows need the network. Cache the
  // app shell / static assets so the SPA loads offline after first visit.
  workboxOptions: {
    navigateFallback: '/',
    runtimeCaching: [
      {
        urlPattern: /^\/manifest\.json$/,
        handler: 'StaleWhileRevalidate',
      },
    ],
  },
});

export default withPWA(nextConfig);