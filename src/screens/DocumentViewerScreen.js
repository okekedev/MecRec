import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import PDFProcessorService from '../services/PDFProcessorService';
import PDFViewer from '../components/PDFViewer';

const DocumentViewerScreen = () => {
  const route = useRoute();
  const { uri, documentId } = route.params;
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [extractedText, setExtractedText] = useState(null);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [docId, setDocId] = useState(documentId);

  const source = { uri };
  
  // Load document details if we have a document ID
  useEffect(() => {
    const loadDocumentDetails = async () => {
      if (docId) {
        const processorService = PDFProcessorService.getInstance();
        const document = await processorService.getDocumentById(docId);
        
        if (document) {
          setExtractedText(document.extractedText);
        }
      }
    };
    
    loadDocumentDetails();
  }, [docId]);

  const onLoadComplete = (numberOfPages) => {
    setLoading(false);
    setTotalPages(numberOfPages);
    
    // If we don't have extracted text yet (no document ID was provided),
    // we'll use a placeholder
    if (!extractedText) {
      setExtractedText("Sample extracted text from the PDF document. This would be the actual text extracted via OCR and direct text extraction during the document processing stage.");
    }
  };

  const onPageChanged = (page) => {
    setCurrentPage(page);
  };

  const toggleTextView = () => {
    setShowExtractedText(!showExtractedText);
  };
  
  const navigateToChat = () => {
    if (docId) {
      navigation.navigate('DocumentChat', { documentId: docId });
    } else {
      // If we don't have a document ID, we'll show an error
      // In a real app, you might want to process the document first
      Alert.alert(
        'Document Not Processed',
        'Please process the document first before using the chat feature.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Document Viewer</Text>
        <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
      </View>
      
      <View style={styles.contentContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Loading document...</Text>
          </View>
        )}
        
        {!showExtractedText ? (
          <PDFViewer
            source={source}
            onLoadComplete={onLoadComplete}
            onPageChanged={onPageChanged}
            onError={(error) => {
              console.log(error);
              setLoading(false);
            }}
            style={styles.pdf}
          />
        ) : (
          <View style={styles.textContainer}>
            <Text style={styles.extractedText}>{extractedText}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={toggleTextView}
        >
          <Text style={styles.buttonText}>
            {showExtractedText ? 'View PDF' : 'View Extracted Text'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.chatButton]}
          onPress={navigateToChat}
          disabled={!docId}
        >
          <Text style={styles.buttonText}>Ask Questions</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    position: 'absolute',
    left: 15,
    padding: 5,
  },
  backButtonText: {
    color: '#3498db',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  pageInfo: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    backgroundColor: '#f5f5f7',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 2,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2c3e50',
  },
  textContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: '#ffffff',
  },
  extractedText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2c3e50',
  },
  footer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  button: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  chatButton: {
    backgroundColor: '#27ae60',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DocumentViewerScreen;