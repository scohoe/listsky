/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ensure proper module resolution for @ alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };
    
    return config;
  },
  // Ensure compatibility with Netlify
  trailingSlash: false,
  // Remove standalone output for Netlify compatibility
  // Let Netlify handle the deployment configuration
  experimental: {
    // Enable modern bundling for better performance
    esmExternals: true,
  },
};

module.exports = nextConfig;