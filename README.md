# MedRec PDF Processor

A React Native application for processing medical referral documents with parallel OCR capabilities. This app allows you to upload and view PDF documents, extract text (via direct methods and OCR), and ask questions about the document using an AI-powered chat interface.

## Features

- Upload and process PDF documents
- Extract text using both direct extraction and parallel OCR
- Generate embeddings for semantic search
- AI-powered chat interface for document questions
- Form extraction for medical referral data
- Cross-platform: works on Android, iOS, and Web

## Latest Updates

- Added parallel OCR processing for significantly faster text extraction
- Optimized PDF processing with multiple Tesseract workers
- Improved UI responsiveness during OCR processing
- Fixed compatibility issues with PDF.js and Tesseract.js

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

## Web Compatibility

The application has been designed to work on web browsers with platform-specific implementations for:

- PDF viewing
- Document picking
- File system operations
- OCR processing with Tesseract.js
- Parallel processing for improved performance

### Performance Notes

- The parallel OCR implementation significantly improves processing time for multi-page documents
- For optimal performance, the app creates multiple Tesseract workers (default: 3)
- Memory usage increases with parallel processing, but the speed improvement is substantial
- Configure the `maxWorkers` value in `ParallelPDFTextExtractionService.js` to adjust the balance between speed and resource usage

## Troubleshooting

If you encounter issues with PDF.js or Tesseract.js, try these solutions:

1. **PDF.js Worker Issues**: Update the worker source URL in `PDFTextExtractionService.js` if needed
2. **Tesseract.js Worker Issues**: Adjust the maxWorkers setting or try switching back to sequential processing
3. **Memory Issues**: Reduce maxWorkers if your device runs out of memory during processing
4. **Web Bundling Issues**: Run `npm start -- --clear-cache` to clear bundler cache

## License

This project is licensed under the MIT License - see the LICENSE file for details