// webpack.config.js - Unified web configuration for both development and production
// Handles: local development (expo start --web) + Docker production builds
const path = require('path');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { DefinePlugin, ProvidePlugin } = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Fix for PDF.js dynamic imports
  config.module.rules.push({
    test: /pdf\.mjs$/,
    use: 'babel-loader',
    include: path.resolve(__dirname, 'node_modules/pdfjs-dist/build/')
  });

  // Add resolve aliases for Node.js modules
  config.resolve.alias = {
    ...config.resolve.alias,
    fs: 'browserify-fs',
    path: require.resolve('path-browserify'),
    stream: require.resolve('stream-browserify'),
    util: require.resolve('util/'),
    crypto: require.resolve('crypto-browserify'),
  };

  // Add ProvidePlugin to make crypto and other modules available globally
  config.plugins.push(
    new ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
      crypto: 'crypto-browserify',
    }),
    // Environment variables - injected at build time from .env or Docker env vars
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      
      // Azure AD Configuration - consistent names across all environments
      'process.env.AZURE_TENANT_ID': JSON.stringify(process.env.AZURE_TENANT_ID),
      'process.env.AZURE_CLIENT_ID': JSON.stringify(process.env.AZURE_CLIENT_ID),
      'process.env.AZURE_REQUIRED_GROUP': JSON.stringify(process.env.AZURE_REQUIRED_GROUP),
    })
  );

  // Add node polyfills for browser compatibility
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    path: require.resolve('path-browserify'),
    util: require.resolve('util/'),
    fs: false,  // Not available in browser
    os: false,  // Not available in browser
    url: false, // Use browser's native URL
  };

  return config;
};