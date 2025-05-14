import React from 'react';
import { isWeb } from '../utils/platform';
import WebPDFViewer from './WebPDFViewer';

// Only import the native PDF viewer if not on web
let NativePDFViewer: any;
if (!isWeb) {
  NativePDFViewer = require('react-native-pdf').default;
}

interface PDFViewerProps {
  source: { uri: string };
  style?: any;
  onLoadComplete?: (numberOfPages: number) => void;
  onPageChanged?: (page: number) => void;
  onError?: (error: Error) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = (props) => {
  if (isWeb) {
    return <WebPDFViewer {...props} />;
  }
  
  // Use the native PDF viewer
  return <NativePDFViewer {...props} />;
};

export default PDFViewer;