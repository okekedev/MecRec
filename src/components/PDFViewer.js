import React from 'react';
import { isWeb } from '../utils/platform';
import WebPDFViewer from './WebPDFViewer';

// Only import the native PDF viewer if not on web
let NativePDFViewer;
if (!isWeb) {
  NativePDFViewer = require('react-native-pdf').default;
}

const PDFViewer = (props) => {
  if (isWeb) {
    return <WebPDFViewer {...props} />;
  }
  
  // Use the native PDF viewer
  return <NativePDFViewer {...props} />;
};

export default PDFViewer;