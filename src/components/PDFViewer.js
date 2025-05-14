import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { isWeb } from '../utils/platform';
import WebPDFViewer from './WebPDFViewer';

// Expo-compatible PDFViewer component
const PDFViewer = (props) => {
  // Use WebPDFViewer for web platform
  if (isWeb) {
    return <WebPDFViewer {...props} />;
  }
  
  // For native platforms, use a placeholder viewer
  // In a production app, you would use expo-file-system to download the PDF
  // and then use expo-sharing to open it in a system PDF viewer
  
  const { source, onLoadComplete, onPageChanged, onError, style } = props;
  
  React.useEffect(() => {
    // Simulate loading a PDF
    setTimeout(() => {
      if (onLoadComplete) {
        // Simulate 5 pages in the PDF
        onLoadComplete(5);
      }
      if (onPageChanged) {
        onPageChanged(1);
      }
    }, 1000);
  }, [onLoadComplete, onPageChanged]);
  
  return (
    <View style={[styles.container, style]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.pdfPlaceholder}>
          <Text style={styles.pdfText}>PDF Preview</Text>
          <Text style={styles.pdfSubtext}>URI: {source.uri}</Text>
          <Text style={styles.pdfNote}>
            This is a placeholder for the PDF viewer in development mode.
          </Text>
          <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: Dimensions.get('window').width,
    backgroundColor: '#f5f5f7',
  },
  scrollView: {
    flex: 1,
  },
  pdfPlaceholder: {
    flex: 1,
    height: Dimensions.get('window').height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e0e0e0',
  },
  pdfText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  pdfSubtext: {
    fontSize: 16,
    marginBottom: 20,
    color: '#34495e',
  },
  pdfNote: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#7f8c8d',
  },
  loader: {
    marginTop: 20,
  }
});

export default PDFViewer;