// webpack.config.js
const path = require('path');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { DefinePlugin, ProvidePlugin } = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Load environment variables from .env file (local dev) or process.env (Docker)
  require('dotenv').config();

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

  // Add ProvidePlugin to make crypto and other modules available
  config.plugins.push(
    new ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
      crypto: 'crypto-browserify',
    }),
    // Environment variables - works for both local .env and Docker env vars
    new DefinePlugin({
      'process.env.AZURE_OPENAI_ENDPOINT': JSON.stringify(
        process.env.AZURE_OPENAI_ENDPOINT || 'https://medrecapp.openai.azure.com/'
      ),
      'process.env.AZURE_OPENAI_API_KEY': JSON.stringify(
        process.env.AZURE_OPENAI_API_KEY
      ),
      'process.env.AZURE_OPENAI_DEPLOYMENT': JSON.stringify(
        process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1-mini'
      ),
      'process.env.AZURE_OPENAI_MODEL_NAME': JSON.stringify(
        process.env.AZURE_OPENAI_MODEL_NAME || 'gpt-4.1-mini'
      ),
      'process.env.AZURE_OPENAI_API_VERSION': JSON.stringify(
        process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'
      ),
    })
  );

  // Add node polyfills
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    path: require.resolve('path-browserify'),
    util: require.resolve('util/'),
    fs: false,
    os: false,
    url: false,
  };

  return config;
};