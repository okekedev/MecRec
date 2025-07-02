// metro.config.js - Metro configuration with web support and environment variables
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

// Add support for .mjs files (for PDF.js)
defaultConfig.resolver.sourceExts.push('mjs');

// Ensure PDFJs worker files and other assets are treated properly
defaultConfig.resolver.assetExts.push('worker.js', 'worker.min.js', 'wasm');

// Add Node.js polyfills for web compatibility
defaultConfig.resolver.alias = {
  ...defaultConfig.resolver.alias,
  'crypto': path.resolve(__dirname, 'node_modules/crypto-browserify'),
  'stream': path.resolve(__dirname, 'node_modules/stream-browserify'),
  'path': path.resolve(__dirname, 'node_modules/path-browserify'),
  'util': path.resolve(__dirname, 'node_modules/util/'),
  'buffer': path.resolve(__dirname, 'node_modules/buffer/'),
  'process': path.resolve(__dirname, 'node_modules/process/browser.js'),
};

// Configure node module polyfills
defaultConfig.resolver.extraNodeModules = {
  'crypto': path.resolve(__dirname, 'node_modules/crypto-browserify'),
  'stream': path.resolve(__dirname, 'node_modules/stream-browserify'),
  'path': path.resolve(__dirname, 'node_modules/path-browserify'),
  'util': path.resolve(__dirname, 'node_modules/util/'),
  'buffer': path.resolve(__dirname, 'node_modules/buffer/'),
  'process': path.resolve(__dirname, 'node_modules/process/browser.js'),
  'fs': false,
  'os': false,
};

module.exports = defaultConfig;