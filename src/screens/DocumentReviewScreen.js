// src/screens/DocumentReviewScreen.js - Fixed scrollbar visibility for web
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
  Modal,
  Platform
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
  
  // Enhanced source highlighting state
  const [showSourceViewer, setShowSourceViewer] = useState(false);
  const [highlightedField, setHighlightedField] = useState(null);
  const [contextualBlocks, setContextualBlocks] = useState([]);
  
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
  
  // ENHANCED: Handle showing contextual source blocks
  const handleShowSource = (fieldKey, fieldValue) => {
    // Get contextual source positions from PDF processor
    const fieldReference = pdfProcessor.getFieldReference(documentId, fieldKey);
    
    if (fieldReference && fieldReference.hasSourceHighlighting) {
      setHighlightedField({ fieldKey, fieldValue });
      setContextualBlocks(fieldReference.sourcePositions);
      setShowSourceViewer(true);
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
  
  // SIMPLIFIED: Just return the context text as-is, no highlighting logic
  const formatContextText = (block) => {
    return { 
      before: block.context || block.text || 'No context available', 
      highlighted: '', 
      after: '' 
    };
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
      
      {/* Progress Header */}
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
      
      {/* FIXED: Enhanced ScrollView with web-specific scrollbar styling */}
      <ScrollView 
        style={[
          { flex: 1 },
          Platform.OS === 'web' && styles.webScrollView
        ]} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          <View style={CommonStyles.contentContainer}>
            {/* Document Header */}
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
            
            {/* Clinical Information Section */}
            <View style={CommonStyles.sectionContainer}>
              <View style={CommonStyles.sectionTitleContainer}>
                <View style={CommonStyles.sectionTitleIcon} />
                <Text style={CommonStyles.sectionTitle}>Clinical Information Review</Text>
              </View>
              
              <Text style={CommonStyles.sectionDescription}>
                Review and verify the extracted information below. Click "Show in Document" to see the contextual source where the AI found each piece of information.
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
            
            {/* Reviewer Authentication */}
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
      
      {/* Source Viewer Modal */}
      <Modal
        visible={showSourceViewer}
        animationType="slide"
        onRequestClose={() => setShowSourceViewer(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.reviewBackground }}>
          <View style={styles.sourceViewerHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSourceViewer(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={Colors.black} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.sourceViewerTitle}>
                Source Context: {highlightedField?.fieldValue}
              </Text>
              <Text style={styles.sourceViewerSubtitle}>
                Found {contextualBlocks.length} contextual location(s)
              </Text>
            </View>
          </View>
          
          <ScrollView 
            style={[
              styles.sourceViewerContent,
              Platform.OS === 'web' && styles.webScrollView
            ]}
            showsVerticalScrollIndicator={true}
          >
            {contextualBlocks.map((block, index) => {
              const { before, highlighted, after } = formatContextText(block);
              
              return (
                <View key={index} style={styles.contextualBlock}>
                  <View style={styles.blockHeader}>
                    <View style={styles.blockHeaderLeft}>
                      <MaterialCommunityIcons 
                        name="map-marker" 
                        size={16} 
                        color={Colors.secondary} 
                        style={styles.locationIcon}
                      />
                      <Text style={styles.blockLocation}>
                        Page {block.page}
                      </Text>
                    </View>
                    <View style={styles.blockHeaderRight}>
                      <Text style={styles.blockConfidence}>
                        {Math.round(block.confidence)}% confidence
                      </Text>
                      <Text style={styles.blockType}>
                        {block.matchType} match
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.contextContainer}>
                    <Text style={styles.contextText}>
                      <Text style={styles.contextBefore}>{before}</Text>
                      <Text style={styles.contextHighlighted}>{highlighted}</Text>
                      <Text style={styles.contextAfter}>{after}</Text>
                    </Text>
                  </View>
                  
                  <View style={styles.blockFooter}>
                    <Text style={styles.blockCoords}>
                      Position: ({Math.round(block.x)}, {Math.round(block.y)}) | {block.wordCount} words | {block.source} source
                    </Text>
                  </View>
                </View>
              );
            })}
            
            {contextualBlocks.length === 0 && (
              <View style={styles.noContextMessage}>
                <MaterialCommunityIcons 
                  name="alert-circle-outline" 
                  size={48} 
                  color={Colors.gray} 
                />
                <Text style={styles.noContextTitle}>No Context Found</Text>
                <Text style={styles.noContextText}>
                  Could not locate contextual information for this field in the document.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// Styles with web-specific scrollbar enhancement
const styles = {
  // Web-specific scrollbar styling
  webScrollView: Platform.OS === 'web' ? {
    overflow: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#888 #f0f0f0',
    '::-webkit-scrollbar': {
      width: '8px',
    },
    '::-webkit-scrollbar-track': {
      background: '#f0f0f0',
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb': {
      background: '#888',
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: '#555',
    },
  } : {},
  
  sourceViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.reviewBorder,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  closeButton: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  sourceViewerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 2,
  },
  sourceViewerSubtitle: {
    fontSize: 14,
    color: Colors.gray,
  },
  sourceViewerContent: {
    flex: 1,
    padding: 16,
  },
  contextualBlock: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.reviewBorder,
  },
  blockHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 6,
  },
  blockLocation: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  blockHeaderRight: {
    alignItems: 'flex-end',
  },
  blockConfidence: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.secondary,
  },
  blockType: {
    fontSize: 12,
    color: Colors.gray,
    textTransform: 'capitalize',
  },
  contextContainer: {
    padding: 16,
  },
  contextText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.black,
  },
  contextBefore: {
    color: Colors.gray,
  },
  contextHighlighted: {
    color: Colors.black,
    fontWeight: '400',
    paddingHorizontal: 0,
    borderRadius: 0,
  },
  contextAfter: {
    color: Colors.gray,
  },
  blockFooter: {
    padding: 12,
    backgroundColor: Colors.reviewBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.reviewBorder,
  },
  blockCoords: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'monospace',
  },
  noContextMessage: {
    alignItems: 'center',
    padding: 32,
    marginTop: 32,
  },
  noContextTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray,
    marginTop: 16,
    marginBottom: 8,
  },
  noContextText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
};

export default DocumentReviewScreen;