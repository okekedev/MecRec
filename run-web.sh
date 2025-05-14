#!/bin/bash

# This is a simple script to start the app in web mode

echo "Starting MedRec App in web mode..."
echo "Make sure you've installed all dependencies with:"
echo "npm install --legacy-peer-deps"
echo "You may need to install these packages separately:"
echo "npm install webpack webpack-cli webpack-dev-server babel-loader html-webpack-plugin file-loader --save-dev --legacy-peer-deps"

if [ ! -d "node_modules/webpack" ]; then
  echo "Webpack appears to be missing. Please install dependencies first."
  exit 1
fi

# Run webpack dev server
npx webpack serve --mode=development --config webpack.config.js