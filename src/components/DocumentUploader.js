import React, { useState, useEffect } from 'react';
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
import ProgressOverlay from './ProgressOverlay';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';
import { MaterialIcons } from '@expo/vector-icons';

const DocumentUploader = ({
  onDocumentProcessed,
  onError,
}) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('Initializing...');
  const [currentStep, setCurrentStep] = useState('');
  const [currentStepProgress, setCurrentStepProgress] = useState(0);
  
  // Set up progress callback
  useEffect(() => {
    const pdfProcessor = PDFProcessorService.getInstance();
    
    // Set up the text extraction service progress handler
    const textExtractionService = pdfProcessor.textExtractionService;
    if (textExtractionService) {
      textExtractionService.setProgressCallback(handleProgressUpdate);
    }
    
    return () => {
      // Remove progress callback when component unmounts
      if (textExtractionService) {
        textExtractionService.setProgressCallback(null);
      }
    };
  }, []);
  
  // Handle progress updates from services
  const handleProgressUpdate = (progressInfo) => {
    setProgressVisible(true);
    
    if (progressInfo.progress !== undefined) {
      setProgress(progressInfo.progress);
    }
    
    if (progressInfo.status) {
      setProgressStatus(progressInfo.status);
    }
    
    if (progressInfo.page !== undefined && progressInfo.totalPages !== undefined) {
      setCurrentStep(`Processing page ${progressInfo.page}`);
      setCurrentStepProgress(progressInfo.page / progressInfo.totalPages);
    }
  };

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
      setProgressVisible(true);
      setProgress(0);
      setProgressStatus('Preparing document for processing...');
      
      // Save document to app storage if it's not already there
      let localPath = document.localPath;
      if (!localPath) {
        setProgressStatus('Saving document...');
        const savedPath = await saveDocumentToAppStorage(document.uri, document.name);
        
        if (savedPath === null) {
          throw new Error('Failed to save document to app storage');
        }
        
        localPath = savedPath;
      }
      
      // Process the document
      setProgressStatus('Extracting text from document...');
      const processorService = PDFProcessorService.getInstance();
      const processedDocument = await processorService.processDocument(
        localPath,
        document.name
      );
      
      // Final steps
      setProgressStatus('Finalizing...');
      setProgress(1);
      
      // Short delay to show completion
      setTimeout(() => {
        setProgressVisible(false);
        setLoading(false);
        
        // Notify parent component
        onDocumentProcessed(processedDocument);
      }, 800);
      
    } catch (error) {
      console.error('Error processing document:', error);
      setProgressVisible(false);
      setLoading(false);
      Alert.alert('Error', 'Failed to process document');
      onError?.(error);
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
        <MaterialIcons name="upload-file" size={24} color="#ffffff" style={styles.uploadIcon} />
        <Text style={styles.uploadButtonText}>
          {document ? 'Change Document' : 'Select PDF Document'}
        </Text>
      </Pressable>

      {document && (
        <View style={styles.documentInfo}>
          <MaterialIcons name="description" size={24} color={Colors.primary} style={styles.documentIcon} />
          <View style={styles.documentDetails}>
            <Text style={styles.documentName} numberOfLines={1} ellipsizeMode="middle">
              {document.name}
            </Text>
            <Text style={styles.documentSize}>
              {Math.round(document.size / 1024)} KB
            </Text>
          </View>
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
          <>
            <MaterialIcons name="send-to-mobile" size={24} color="#ffffff" style={styles.processIcon} />
            <Text style={styles.processButtonText}>Process Document</Text>
          </>
        )}
      </Pressable>
      
      {/* Progress Overlay */}
      <ProgressOverlay
        visible={progressVisible}
        progress={progress}
        status={progressStatus}
        showDetails={true}
        currentStep={currentStep}
        currentStepProgress={currentStepProgress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  uploadButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...(isWeb && {
      cursor: 'pointer',
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    }),
  },
  buttonPressed: {
    opacity: 0.8,
    transform: isWeb ? [{ scale: 0.98 }] : [],
  },
  uploadIcon: {
    marginRight: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  documentIcon: {
    marginRight: 10,
  },
  documentDetails: {
    flex: 1,
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
    backgroundColor: Colors.secondary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...(isWeb && {
      cursor: 'pointer',
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    }),
  },
  processIcon: {
    marginRight: 10,
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