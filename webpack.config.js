// webpack.config.js - Your working version
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

  // Add ProvidePlugin to make crypto and other modules available
  config.plugins.push(
    new ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
      crypto: 'crypto-browserify',
    }),
    // NO Azure OpenAI environment variables - they're handled by the API server now
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      // Add other NON-SENSITIVE environment variables here if needed
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