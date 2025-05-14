import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { isWeb } from '../utils/platform';
import { pickPdfDocument, saveDocumentToAppStorage } from '../utils/documentUtils';
import PDFProcessorService from '../services/PDFProcessorService';

const DocumentUploader = ({
  onDocumentProcessed,
  onError,
}) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDocumentPick = async () => {
    try {
      const pickedDocument = await pickPdfDocument();
      
      if (pickedDocument) {
        setDocument(pickedDocument);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      onError?.(error);
    }
  };

  const handleProcessDocument = async () => {
    if (!document) {
      Alert.alert('Error', 'Please select a document first');
      return;
    }

    try {
      setLoading(true);
      
      // Save document to app storage if it's not already there
      let localPath = document.localPath;
      if (!localPath) {
        const savedPath = await saveDocumentToAppStorage(document.uri, document.name);
        
        if (savedPath === null) {
          throw new Error('Failed to save document to app storage');
        }
        
        localPath = savedPath;
      }
      
      // Process the document
      const processorService = PDFProcessorService.getInstance();
      const processedDocument = await processorService.processDocument(
        localPath,
        document.name
      );
      
      // Notify parent component
      onDocumentProcessed(processedDocument);
      
    } catch (error) {
      console.error('Error processing document:', error);
      Alert.alert('Error', 'Failed to process document');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({pressed}) => [
          styles.uploadButton,
          pressed && styles.buttonPressed
        ]}
        onPress={handleDocumentPick}
        disabled={loading}
      >
        <Text style={styles.uploadButtonText}>
          {document ? 'Change Document' : 'Select PDF Document'}
        </Text>
      </Pressable>

      {document && (
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1} ellipsizeMode="middle">
            {document.name}
          </Text>
          <Text style={styles.documentSize}>
            {Math.round(document.size / 1024)} KB
          </Text>
        </View>
      )}

      <Pressable
        style={({pressed}) => [
          styles.processButton, 
          (!document || loading) && styles.disabledButton,
          pressed && !loading && document && styles.buttonPressed
        ]}
        onPress={handleProcessDocument}
        disabled={!document || loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.processButtonText}>Process Document</Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  uploadButton: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    ...(isWeb && {
      cursor: 'pointer',
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    }),
  },
  buttonPressed: {
    opacity: 0.8,
    transform: isWeb ? [{ scale: 0.98 }] : [],
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  documentInfo: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    maxWidth: '90%',
  },
  documentSize: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  processButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    ...(isWeb && {
      cursor: 'pointer',
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    }),
  },
  processButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    ...(isWeb && {
      cursor: 'not-allowed',
    }),
  },
});

export default DocumentUploader;