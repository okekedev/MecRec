// metro.config.js - Fixed for Expo SDK 50+ with proper web platform support
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

// Add support for .mjs files in PDF.js
defaultConfig.resolver.sourceExts.push('mjs');

// Ensure PDFJs worker files are treated as assets
defaultConfig.resolver.assetExts.push('worker.js', 'worker.min.js');

// IMPORTANT: Use Expo's babel transformer for web compatibility
defaultConfig.transformer.babelTransformerPath = require.resolve('@expo/metro-config/babel-transformer');

// Set specific paths for node module resolution
defaultConfig.resolver.extraNodeModules = {
  // Provide polyfills for Node.js modules
  'crypto': path.resolve(__dirname, 'node_modules/crypto-browserify'),
  'stream': path.resolve(__dirname, 'node_modules/stream-browserify'),
  'path': path.resolve(__dirname, 'node_modules/path-browserify'),
  'zlib': path.resolve(__dirname, 'node_modules/browserify-zlib'),
  'util': path.resolve(__dirname, 'node_modules/util/'),
  'buffer': path.resolve(__dirname, 'node_modules/buffer/'),
  'process': path.resolve(__dirname, 'node_modules/process/browser.js'),
};

module.exports = defaultConfig;