# MedRec PDF Processor

A React Native application for processing medical referral documents. This app allows you to upload and view PDF documents, extract text (via direct methods and OCR), and ask questions about the document using an AI-powered chat interface.

## Features

- Upload and process PDF documents
- Extract text using both direct extraction and OCR
- Generate embeddings for semantic search
- AI-powered chat interface for document questions
- Form extraction for medical referral data
- Cross-platform: works on Android, iOS, and Web

## Project Structure

- `src/components/`: Reusable UI components
- `src/screens/`: Application screens
- `src/services/`: Business logic and services
- `src/utils/`: Utility functions and helpers
- `src/assets/`: Images and other static assets
- `src/navigation/`: Navigation configuration

## Running the App

### Prerequisites

- Node.js (v18+)
- npm or yarn
- For Android: Android Studio, Android SDK
- For iOS: Xcode, CocoaPods

### Installing Dependencies

```bash
# Install dependencies
npm install --legacy-peer-deps
```

### Running on Android

```bash
# Start Metro bundler
npm start

# In a new terminal, run on Android
npm run android
```

### Running on iOS

```bash
# Install CocoaPods dependencies
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# In a new terminal, run on iOS
npm run ios
```

### Running on Web

#### Option 1: Simple Web Demo (Recommended)

We've created a simplified web demo that doesn't require webpack configuration:

```bash
# Run the simple web demo
npm run web:simple
```

This will create a basic HTML page with PDF upload capabilities and serve it using a local server.

#### Option 2: Full React Native Web (Advanced)

For the full React Native Web experience (may require additional setup):

```bash
# Install web-specific dependencies
npm install webpack webpack-cli webpack-dev-server babel-loader html-webpack-plugin file-loader url-loader babel-plugin-react-native-web crypto-browserify stream-browserify path-browserify buffer browserify-zlib util url --save-dev --legacy-peer-deps

# Run the web version
npm run web
```

Note: The full React Native Web version may encounter compatibility issues due to the complex interaction of React Native modules with the web platform.

## Web Compatibility

The application has been designed to work on web browsers with platform-specific implementations for:

- PDF viewing
- Document picking
- File system operations

Due to web platform limitations, some features may work differently on web:
- Document storage is temporary (files aren't saved between sessions)
- PDF manipulation capabilities are more limited
- Native device features aren't accessible

## License

This project is licensed under the MIT License - see the LICENSE file for details.