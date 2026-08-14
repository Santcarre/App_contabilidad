const withPWA = require("next-pwa");
const webpack = require("webpack");

const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  images: {
    domains: ["lh3.googleusercontent.com", "avatars.githubusercontent.com"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Los imports "node:*" solo provienen de librerías server-only
      // (google-auth-library, gcp-metadata). Si llegan al bundle de cliente,
      // ignóralos: su código nunca se ejecuta ahí.
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /^node:/ })
      );
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://lh3.googleusercontent.com",
              "connect-src 'self' https://sheets.googleapis.com https://api.frankfurter.dev https://oauth2.googleapis.com",
              "frame-src https://accounts.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  customWorkerDir: "worker",
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.frankfurter\.dev\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "exchange-rates",
        expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /^https:\/\/sheets\.googleapis\.com\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "sheets-api",
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-apis",
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
      },
    },
  ],
});

module.exports = withPWAConfig(nextConfig);