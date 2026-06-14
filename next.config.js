/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // OneDrive/synced folders can break webpack's on-disk pack cache (ENOENT on rename).
    if (dev) config.cache = { type: "memory" };
    return config;
  },
};

module.exports = nextConfig;
