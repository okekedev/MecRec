// src/screens/DocumentReviewScreen.js - Add PDF viewer with highlights
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Modal
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import PDFProcessorService from '../services/PDFProcessorService';
import MedicalFieldService from '../services/MedicalFieldService';
import EnhancedHeader from '../components/Header';
import ReviewField from '../components/ReviewField';
import { Colors, CommonStyles } from '../styles';
import * as Animations from '../animations';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DocumentReviewScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { documentId } = route.params;
  
  // Services
  const pdfProcessor = PDFProcessorService.getInstance();
  const medicalFieldService = MedicalFieldService.getInstance();
  
  // Existing state
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState(null);
  const [formData, setFormData] = useState({});
  const [reviewedFields, setReviewedFields] = useState({});
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerCredentials, setReviewerCredentials] = useState('');
  const [extractionError, setExtractionError] = useState('');
  
  // NEW: Source highlighting state
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [highlightedField, setHighlightedField] = useState(null);
  const [sourcePositions, setSourcePositions] = useState([]);
  
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Existing useEffect for loading document
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        
        const document = await pdfProcessor.getDocumentById(documentId);
        
        if (!document) {
          throw new Error('Document not found');
        }
        
        console.log('Document loaded:', documentId);
        
        // Check for extraction errors
        if (document.formData.extractionMethod === 'failed' || 
            document.formData.extractionMethod === 'error' || 
            document.formData.extractionMethod === 'unavailable' ||
            document.formData.error) {
          setExtractionError(document.formData.error || 'Error during information extraction');
        }
        
        setDocumentData(document);
        
        // Use service to get clean form data
        const fieldOrder = medicalFieldService.getFieldOrder();
        const cleanFormData = {};
        
        fieldOrder.forEach(fieldKey => {
          cleanFormData[fieldKey] = document.formData[fieldKey] || '';
        });
        
        setFormData(cleanFormData);
        
        // Initialize reviewed fields
        const initialReviewed = {};
        fieldOrder.forEach(fieldKey => {
          initialReviewed[fieldKey] = false;
        });
        setReviewedFields(initialReviewed);
        
        setLoading(false);
        
        // Start animations
        Animated.parallel([
          Animations.fadeIn(fadeAnim, 400),
          Animations.slideInUp(slideAnim, 30, 500)
        ]).start();
      } catch (error) {
        console.error('Error loading document:', error);
        Alert.alert('Error', 'Failed to load document for review');
        navigation.goBack();
      }
    };
    
    loadDocument();
  }, [documentId]);
  
  // NEW: Handle showing source in PDF
  const handleShowSource = (fieldKey, fieldValue) => {
    console.log(`Showing source for ${fieldKey}: ${fieldValue}`);
    
    // Get source positions from PDF processor
    const fieldReference = pdfProcessor.getFieldReference(documentId, fieldKey);
    
    if (fieldReference && fieldReference.hasSourceHighlighting) {
      setHighlightedField({ fieldKey, fieldValue });
      setSourcePositions(fieldReference.sourcePositions);
      setShowPdfViewer(true);
    } else {
      Alert.alert('No Source Found', 'Could not locate this information in the document.');
    }
  };
  
  // Existing handler functions
  const handleFieldChange = (fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };
  
  const handleReviewToggle = (fieldKey, value) => {
    setReviewedFields(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };
  
  // Existing utility functions
  const calculateProgress = () => {
    const fieldOrder = medicalFieldService.getFieldOrder();
    const total = fieldOrder.length;
    const reviewed = fieldOrder.filter(fieldKey => reviewedFields[fieldKey]).length;
    
    return total > 0 ? reviewed / total : 0;
  };
  
  const allFieldsReviewed = () => {
    const fieldOrder = medicalFieldService.getFieldOrder();
    return fieldOrder.every(fieldKey => reviewedFields[fieldKey]);
  };
  
  const markAllAsReviewed = () => {
    const allReviewed = {};
    medicalFieldService.getFieldOrder().forEach(fieldKey => {
      allReviewed[fieldKey] = true;
    });
    setReviewedFields(allReviewed);
  };
  
  const generatePDF = () => {
    if (!allFieldsReviewed()) {
      Alert.alert('Error', 'Please review all fields before generating a report.');
      return;
    }
    
    if (!reviewerName.trim()) {
      Alert.alert('Error', 'Please enter your name as the reviewer.');
      return;
    }
    
    navigation.navigate('PDFPreview', {
      documentId,
      formData,
      reviewerName,
      reviewerCredentials,
      reviewDate: new Date().toISOString()
    });
  };
  
  const getProgressColor = () => {
    const progress = calculateProgress();
    if (progress < 0.3) return Colors.warning;
    if (progress < 0.7) return Colors.info;
    return Colors.success;
  };
  
  // Loading screen
  if (loading) {
    return (
      <View style={CommonStyles.loadingContainer}>
        <View style={CommonStyles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={CommonStyles.loadingText}>Loading medical document</Text>
          <Text style={CommonStyles.loadingSubtext}>Preparing data for review</Text>
        </View>
      </View>
    );
  }
  
  const fieldOrder = medicalFieldService.getFieldOrder();
  const reviewedCount = fieldOrder.filter(fieldKey => reviewedFields[fieldKey]).length;
  const progressPercent = Math.round(calculateProgress() * 100);
  
  return (
    <SafeAreaView style={CommonStyles.screenContainer}>
      <EnhancedHeader 
        title="Clinical Document Review" 
        showBackButton={true}
      />
      
      {/* Progress Header - existing code */}
      <View style={CommonStyles.headerContainer}>
        <View style={CommonStyles.headerTextContainer}>
          <Text style={CommonStyles.headerText}>Review Progress</Text>
          <Text style={[CommonStyles.headerPercentage, { color: getProgressColor() }]}>
            {progressPercent}%
          </Text>
        </View>
        <View style={CommonStyles.progressBarContainer}>
          <Animated.View 
            style={[
              CommonStyles.progressBar,
              { 
                width: `${progressPercent}%`,
                backgroundColor: getProgressColor()
              }
            ]} 
          />
        </View>
        <Text style={CommonStyles.headerDetail}>
          {reviewedCount} of {fieldOrder.length} fields reviewed
        </Text>
      </View>
      
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          <View style={CommonStyles.contentContainer}>
            {/* Document Header - existing code */}
            <View style={CommonStyles.sectionContainer}>
              <Text style={CommonStyles.sectionTitle}>{documentData?.name}</Text>
              <Text style={[CommonStyles.sectionDescription, { marginBottom: 0 }]}>
                Processed on {new Date(documentData?.date).toLocaleDateString()}
              </Text>
              
              {extractionError && (
                <View style={CommonStyles.errorContainer}>
                  <Text style={[CommonStyles.messageTitle, CommonStyles.errorTitle]}>
                    AI Extraction Issue
                  </Text>
                  <Text style={CommonStyles.messageText}>
                    {extractionError}. Please review all fields carefully and update as needed.
                  </Text>
                </View>
              )}
            </View>
            
            {/* Clinical Information Section - UPDATED with source highlighting */}
            <View style={CommonStyles.sectionContainer}>
              <View style={CommonStyles.sectionTitleContainer}>
                <View style={CommonStyles.sectionTitleIcon} />
                <Text style={CommonStyles.sectionTitle}>Clinical Information Review</Text>
              </View>
              
              <Text style={CommonStyles.sectionDescription}>
                Review and verify the extracted information below. Click "Show in Document" to see where the AI found each piece of information.
              </Text>
              
              <View style={{ marginBottom: 20 }}>
                {fieldOrder.map(fieldKey => {
                  const fieldReference = pdfProcessor.getFieldReference(documentId, fieldKey);
                  const aiReasoning = fieldReference?.explanation || 'No reasoning provided';
                  const hasSourceHighlighting = fieldReference?.hasSourceHighlighting || false;
                  
                  return (
                    <ReviewField
                      key={fieldKey}
                      fieldKey={fieldKey}
                      value={formData[fieldKey] || ''}
                      onValueChange={(newValue) => handleFieldChange(fieldKey, newValue)}
                      isReviewed={reviewedFields[fieldKey] || false}
                      onReviewChange={(newValue) => handleReviewToggle(fieldKey, newValue)}
                      aiReasoning={aiReasoning}
                      hasSourceHighlighting={hasSourceHighlighting}
                      onShowSource={handleShowSource}
                    />
                  );
                })}
              </View>
              
              <TouchableOpacity
                style={CommonStyles.secondaryButton}
                onPress={markAllAsReviewed}
                activeOpacity={0.8}
              >
                <Text style={CommonStyles.secondaryButtonText}>Mark All as Reviewed</Text>
              </TouchableOpacity>
            </View>
            
            {/* Reviewer Authentication - existing code unchanged */}
            <View style={CommonStyles.sectionContainer}>
              <View style={CommonStyles.sectionTitleContainer}>
                <View style={[CommonStyles.sectionTitleIcon, { backgroundColor: Colors.secondary }]} />
                <Text style={CommonStyles.sectionTitle}>Clinician Authentication</Text>
              </View>
              
              <View style={{ marginBottom: 20 }}>
                <Text style={CommonStyles.inputLabel}>Reviewer Name*</Text>
                <TextInput
                  style={CommonStyles.input}
                  value={reviewerName}
                  onChangeText={setReviewerName}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.gray}
                />
                
                <Text style={CommonStyles.inputLabel}>Credentials</Text>
                <TextInput
                  style={CommonStyles.input}
                  value={reviewerCredentials}
                  onChangeText={setReviewerCredentials}
                  placeholder="e.g., RN, BSN, CPN"
                  placeholderTextColor={Colors.gray}
                />
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <Text style={[CommonStyles.inputLabel, { marginBottom: 0, marginRight: 10 }]}>
                    Review Date:
                  </Text>
                  <Text style={{ fontSize: 16, color: Colors.gray }}>
                    {new Date().toLocaleDateString()}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={[
                  CommonStyles.primaryButton,
                  (!allFieldsReviewed() || !reviewerName.trim()) && CommonStyles.disabledButton
                ]}
                onPress={generatePDF}
                disabled={!allFieldsReviewed() || !reviewerName.trim()}
                activeOpacity={0.8}
              >
                <Text style={[
                  CommonStyles.primaryButtonText,
                  (!allFieldsReviewed() || !reviewerName.trim()) && CommonStyles.disabledButtonText
                ]}>
                  Generate Clinical Report
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
      
      {/* NEW: PDF Viewer Modal with Highlights */}
      <Modal
        visible={showPdfViewer}
        animationType="slide"
        onRequestClose={() => setShowPdfViewer(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.reviewBackground }}>
          <View style={styles.pdfViewerHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPdfViewer(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={Colors.black} />
            </TouchableOpacity>
            <Text style={styles.pdfViewerTitle}>
              Source: {highlightedField?.fieldValue}
            </Text>
          </View>
          
          <View style={styles.pdfViewerContent}>
            {/* Simple PDF viewer with highlights */}
            <Text style={styles.highlightInfo}>
              Found {sourcePositions.length} location(s) in document
            </Text>
            
            {sourcePositions.map((position, index) => (
              <View key={index} style={styles.positionInfo}>
                <Text style={styles.positionText}>
                  Page {position.page}: "{position.text}" 
                </Text>
                <Text style={styles.positionCoords}>
                  Location: X:{Math.round(position.x)}, Y:{Math.round(position.y)}
                </Text>
              </View>
            ))}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// NEW: Styles for PDF viewer
const styles = {
  pdfViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.reviewBorder,
    backgroundColor: Colors.white
  },
  closeButton: {
    marginRight: 16
  },
  pdfViewerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.black,
    flex: 1
  },
  pdfViewerContent: {
    flex: 1,
    padding: 16
  },
  highlightInfo: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
    marginBottom: 16
  },
  positionInfo: {
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary
  },
  positionText: {
    fontSize: 16,
    color: Colors.black,
    marginBottom: 4
  },
  positionCoords: {
    fontSize: 14,
    color: Colors.gray
  }
};

export default DocumentReviewScreen;