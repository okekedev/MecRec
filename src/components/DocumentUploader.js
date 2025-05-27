// Enhanced DocumentUploader.js with Progress Integration
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { isWeb } from '../utils/platform';
import { pickPdfDocument, saveDocumentToAppStorage } from '../utils/documentUtils';
import PDFProcessorService from '../services/PDFProcessorService';
import ProgressOverlay from './ProgressOverlay';
import { Colors, CommonStyles } from '../styles';
import { MaterialIcons } from '@expo/vector-icons';

const DocumentUploader = ({
  onDocumentProcessed,
  onError,
}) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('processing');
  const [currentStep, setCurrentStep] = useState('');
  const [currentStepProgress, setCurrentStepProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  // Set up progress callback
  useEffect(() => {
    const pdfProcessor = PDFProcessorService.getInstance();
    
    // Set progress callback
    pdfProcessor.setProgressCallback(handleProgressUpdate);
    
    return () => {
      // Remove progress callback when component unmounts
      pdfProcessor.setProgressCallback(null);
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
    
    if (progressInfo.currentStep) {
      setCurrentStep(progressInfo.currentStep);
    }
    
    if (progressInfo.message) {
      setProgressMessage(progressInfo.message);
    }
    
    // Handle completion
    if (progressInfo.status === 'complete') {
      // Add a small delay before hiding the progress overlay
      setTimeout(() => {
        setProgressVisible(false);
      }, 1000);
    }
    
    // Handle errors
    if (progressInfo.status === 'error') {
      setTimeout(() => {
        setProgressVisible(false);
        Alert.alert('Error', progressInfo.message || 'An error occurred during processing');
      }, 2000);
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
      setProgressStatus('processing');
      setCurrentStep('Starting');
      setProgressMessage('Preparing to process document');
      
      // Save document to app storage if it's not already there
      let localPath = document.localPath;
      if (!localPath) {
        setCurrentStep('Saving Document');
        setProgressMessage('Saving document to local storage');
        const savedPath = await saveDocumentToAppStorage(document.uri, document.name);
        
        if (savedPath === null) {
          throw new Error('Failed to save document to app storage');
        }
        
        localPath = savedPath;
      }
      
      // Process the document - progress updates will be handled by callback
      const processorService = PDFProcessorService.getInstance();
      const processedDocument = await processorService.processDocument(
        localPath,
        document.name
      );
      
      // Ensure loading state is cleaned up
      setLoading(false);
      
      // Notify parent component
      onDocumentProcessed(processedDocument);
      
    } catch (error) {
      console.error('Error processing document:', error);
      setProgressVisible(false);
      setLoading(false);
      Alert.alert('Error', 'Failed to process document');
      onError?.(error);
    }
  };

  return (
    <View style={CommonStyles.uploaderContainer}>
      <Pressable
        style={({pressed}) => [
          CommonStyles.uploadButton,
          pressed && CommonStyles.uploadButtonPressed
        ]}
        onPress={handleDocumentPick}
        disabled={loading}
      >
        <MaterialIcons name="upload-file" size={24} color="#ffffff" style={CommonStyles.uploadIcon} />
        <Text style={CommonStyles.uploadButtonText}>
          {document ? 'Change Document' : 'Select PDF Document'}
        </Text>
      </Pressable>

      {document && (
        <View style={CommonStyles.documentInfo}>
          <MaterialIcons name="description" size={24} color={Colors.primary} style={CommonStyles.documentIcon} />
          <View style={CommonStyles.documentDetails}>
            <Text style={CommonStyles.documentName}>
              {document.name}
            </Text>
            <Text style={CommonStyles.documentSize}>
              {Math.round(document.size / 1024)} KB
            </Text>
          </View>
        </View>
      )}

      <Pressable
        style={({pressed}) => [
          CommonStyles.processButton, 
          (!document || loading) && CommonStyles.uploaderDisabledButton,
          pressed && !loading && document && CommonStyles.uploadButtonPressed
        ]}
        onPress={handleProcessDocument}
        disabled={!document || loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <MaterialIcons name="send-to-mobile" size={24} color="#ffffff" style={CommonStyles.processIcon} />
            <Text style={CommonStyles.processButtonText}>Process Document</Text>
          </>
        )}
      </Pressable>
      
      {/* Progress Overlay with enhanced AI feedback */}
      <ProgressOverlay
        visible={progressVisible}
        progress={progress}
        status={progressStatus}
        currentStep={currentStep}
        message={progressMessage}
      />
    </View>
  );
};

export default DocumentUploader;