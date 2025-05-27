// Updated DocumentReviewScreen.js with new field names and enhanced reference display
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Switch,
  Animated
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import PDFProcessorService from '../services/PDFProcessorService';
import EnhancedHeader from '../components/EnhancedHeader';
import ReviewField from '../components/ReviewField';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';
import * as Animations from '../animations';

const DocumentReviewScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { documentId } = route.params;
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState(null);
  const [formData, setFormData] = useState({});
  const [reviewedFields, setReviewedFields] = useState({});
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerCredentials, setReviewerCredentials] = useState('');
  const [allFieldsReviewed, setAllFieldsReviewed] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Load document data
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        
        // Get the PDF processor service
        const processorService = PDFProcessorService.getInstance();
        
        // Load the document by ID
        const document = await processorService.getDocumentById(documentId);
        
        if (!document) {
          throw new Error('Document not found');
        }
        
        // Debug logging
        console.log('Document loaded:', documentId);
        console.log('Form data fields:', Object.keys(document.formData).filter(k => !k.startsWith('_')));
        
        // Check for extraction errors
        if (document.formData.extractionMethod === 'failed' || 
            document.formData.extractionMethod === 'error' || 
            document.formData.extractionMethod === 'unavailable' ||
            document.formData.error) {
          setExtractionError(document.formData.error || 'Error during information extraction');
        }
        
        // Set document data
        setDocumentData(document);
        
        // Set form data
        if (document.formData) {
          // Filter out metadata fields for the form
          const filteredFormData = {};
          Object.keys(document.formData).forEach(key => {
            if (!key.startsWith('_') && key !== 'extractionMethod' && key !== 'extractionDate' && key !== 'error') {
              filteredFormData[key] = document.formData[key];
            }
          });
          
          setFormData(filteredFormData);
          
          // Initialize reviewed fields
          const initialReviewed = {};
          Object.keys(filteredFormData).forEach(key => {
            initialReviewed[key] = false;
          });
          setReviewedFields(initialReviewed);
        }
        
        setLoading(false);
        
        // Start animations after loading
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
  
  // Update field value
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };
  
  // Toggle field review status
  const handleReviewToggle = (fieldName, value) => {
    setReviewedFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };
  
  // Calculate progress
  const calculateProgress = () => {
    if (!reviewedFields || Object.keys(reviewedFields).length === 0) {
      return 0;
    }
    
    const total = Object.keys(reviewedFields).length;
    const reviewed = Object.values(reviewedFields).filter(v => v).length;
    
    return (reviewed / total) * 100;
  };
  
  // Check if all fields are reviewed
  useEffect(() => {
    const allReviewed = Object.values(reviewedFields).every(v => v);
    setAllFieldsReviewed(allReviewed);
  }, [reviewedFields]);
  
  // Mark all fields as reviewed
  const markAllAsReviewed = () => {
    const allReviewed = {};
    Object.keys(reviewedFields).forEach(key => {
      allReviewed[key] = true;
    });
    setReviewedFields(allReviewed);
  };
  
  // Generate PDF
  const generatePDF = () => {
    if (!allFieldsReviewed) {
      Alert.alert('Error', 'Please review all fields before generating a report.');
      return;
    }
    
    if (!reviewerName.trim()) {
      Alert.alert('Error', 'Please enter your name as the reviewer.');
      return;
    }
    
    // Navigate to PDF preview with the data
    navigation.navigate('PDFPreview', {
      documentId,
      formData,
      reviewerName,
      reviewerCredentials,
      reviewDate: new Date().toISOString()
    });
  };
  
  // Enhanced field label formatting with updated names
  const formatLabel = (camelCase) => {
    const labelMap = {
      'patientName': 'Patient Name',
      'patientDOB': 'Date of Birth',
      'insurance': 'Insurance Information',
      'location': 'Location/Facility',
      'dx': 'Diagnosis (Dx)',
      'pcp': 'Primary Care Provider (PCP)',
      'dc': 'Discharge (DC)',
      'wounds': 'Wounds/Injuries',
      'medications': 'Medications & Antibiotics', // Updated
      'cardiacDrips': 'Cardiac Medications/Drips',
      'labsAndVitals': 'Labs & Vital Signs', // Updated
      'faceToFace': 'Face-to-Face Evaluations',
      'history': 'Medical History',
      'mentalHealthState': 'Mental Health State',
      'additionalComments': 'Additional Comments'
    };
    
    return labelMap[camelCase] || camelCase
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };
  
  // Modern loading screen
  if (loading) {
    return (
      <View style={modernStyles.loadingContainer}>
        <View style={modernStyles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={modernStyles.loadingText}>Loading medical document</Text>
          <Text style={modernStyles.loadingSubtext}>Preparing data for review</Text>
        </View>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={modernStyles.container}>
      <EnhancedHeader 
        title="Clinical Document Review" 
        showBackButton={true}
      />
      
      {/* Progress Bar with percentage */}
      <View style={modernStyles.progressContainer}>
        <View style={modernStyles.progressTextContainer}>
          <Text style={modernStyles.progressText}>
            Review Progress
          </Text>
          <Text style={modernStyles.progressPercentage}>
            {Math.round(calculateProgress())}%
          </Text>
        </View>
        <View style={modernStyles.progressBarContainer}>
          <Animated.View 
            style={[
              modernStyles.progressBar, 
              { 
                width: `${calculateProgress()}%`,
                backgroundColor: calculateProgress() < 30 
                  ? Colors.warning 
                  : calculateProgress() < 70 
                    ? Colors.info 
                    : Colors.success 
              }
            ]} 
          />
        </View>
      </View>
      
      <ScrollView style={modernStyles.scrollView}>
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          <View style={modernStyles.content}>
            <View style={modernStyles.documentHeader}>
              <Text style={modernStyles.documentName}>{documentData?.name}</Text>
              <Text style={modernStyles.documentDate}>
                Processed on {new Date(documentData?.date).toLocaleDateString()}
              </Text>
              
              {/* Display extraction warning if there was an error */}
              {extractionError && (
                <View style={modernStyles.extractionErrorContainer}>
                  <Text style={modernStyles.extractionErrorTitle}>AI Extraction Issue</Text>
                  <Text style={modernStyles.extractionErrorText}>
                    {extractionError}. Please review all fields carefully and update as needed.
                  </Text>
                </View>
              )}
            </View>
            
            <View style={modernStyles.sectionContainer}>
              <View style={modernStyles.sectionTitleContainer}>
                <View style={modernStyles.sectionTitleIcon} />
                <Text style={modernStyles.sectionTitle}>Clinical Information Review</Text>
              </View>
              
              <Text style={modernStyles.sectionDescription}>
                Review and verify the extracted information below. Each field shows enhanced source tracking 
                to help you understand where the AI found the information in the original document.
              </Text>
              
              <View style={modernStyles.fieldsContainer}>
                {/* Updated field order with new names - prioritize critical patient info */}
                {['patientName', 'patientDOB', 'insurance', 'location', 'dx', 'pcp', 'dc', 'wounds', 
                  'medications', 'cardiacDrips', 'labsAndVitals', 'faceToFace', 'history', 
                  'mentalHealthState', 'additionalComments'].map(fieldName => {
                  // Skip if field doesn't exist in formData
                  if (!(fieldName in formData)) return null;
                  
                  // Get enhanced field reference with detailed tracking
                  const processorService = PDFProcessorService.getInstance();
                  const fieldReference = processorService.getFieldReference(documentId, fieldName);
                  
                  // Enhanced source information display
                  let sourceText = '';
                  let sourceType = '';
                  let sourceConfidence = '';
                  
                  if (fieldReference) {
                    sourceText = fieldReference.matchedSegment || fieldReference.text || '';
                    sourceType = fieldReference.location || '';
                    
                    // Add confidence and match type information
                    if (fieldReference.matchType && fieldReference.confidence !== undefined) {
                      sourceConfidence = `${fieldReference.matchType} match (${Math.round(fieldReference.confidence * 100)}% confidence)`;
                      if (fieldReference.pageNumber) {
                        sourceConfidence += ` - Page ${fieldReference.pageNumber}`;
                      }
                    }
                    
                    // Enhance source type with additional context
                    if (sourceConfidence) {
                      sourceType += sourceConfidence ? ` - ${sourceConfidence}` : '';
                    }
                  }
                  
                  // Determine if field needs multiline
                  const needsMultiline = [
                    'history', 
                    'mentalHealthState', 
                    'additionalComments',
                    'labsAndVitals', // Updated field name
                    'wounds',
                    'medications' // Updated field name
                  ].includes(fieldName);
                  
                  return (
                    <ReviewField
                      key={fieldName}
                      label={formatLabel(fieldName)}
                      value={formData[fieldName] || ''}
                      onValueChange={(newValue) => handleFieldChange(fieldName, newValue)}
                      isReviewed={reviewedFields[fieldName] || false}
                      onReviewChange={(newValue) => handleReviewToggle(fieldName, newValue)}
                      sourceText={sourceText}
                      sourceType={sourceType}
                      multiline={needsMultiline}
                    />
                  );
                })}
              </View>
              
              <TouchableOpacity
                style={modernStyles.markAllButton}
                onPress={markAllAsReviewed}
              >
                <Text style={modernStyles.markAllButtonText}>
                  Mark All as Reviewed
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Authentication section */}
            <View style={modernStyles.sectionContainer}>
              <View style={modernStyles.sectionTitleContainer}>
                <View style={[modernStyles.sectionTitleIcon, modernStyles.authIcon]} />
                <Text style={modernStyles.sectionTitle}>Clinician Authentication</Text>
              </View>
              
              <View style={modernStyles.reviewerInfoContainer}>
                <Text style={modernStyles.inputLabel}>Reviewer Name*</Text>
                <TextInput
                  style={modernStyles.reviewerInput}
                  value={reviewerName}
                  onChangeText={setReviewerName}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.gray}
                />
                
                <Text style={modernStyles.inputLabel}>Credentials</Text>
                <TextInput
                  style={modernStyles.reviewerInput}
                  value={reviewerCredentials}
                  onChangeText={setReviewerCredentials}
                  placeholder="e.g., RN, BSN, CPN"
                  placeholderTextColor={Colors.gray}
                />
                
                <View style={modernStyles.reviewDateContainer}>
                  <Text style={modernStyles.reviewDateLabel}>Review Date:</Text>
                  <Text style={modernStyles.reviewDate}>
                    {new Date().toLocaleDateString()}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={[
                  modernStyles.generatePDFButton,
                  (!allFieldsReviewed || !reviewerName.trim()) && modernStyles.disabledButton
                ]}
                onPress={generatePDF}
                disabled={!allFieldsReviewed || !reviewerName.trim()}
              >
                <Text style={modernStyles.generatePDFButtonText}>
                  Generate Clinical Report
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const modernStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc', // Lighter, more clinical background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
  },
  loadingCard: {
    backgroundColor: Colors.white,
    padding: Spacing.large,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    ...Shadows.medium,
    width: '80%',
    maxWidth: 300,
  },
  loadingText: {
    marginTop: Spacing.medium,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
  },
  loadingSubtext: {
    marginTop: Spacing.small,
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  progressContainer: {
    padding: Spacing.medium,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#edf0f7',
    ...Shadows.soft,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  progressText: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
  },
  progressPercentage: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#edf0f7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.large,
  },
  documentHeader: {
    marginBottom: Spacing.medium,
    padding: Spacing.medium,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    ...Shadows.soft,
  },
  documentName: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
    marginBottom: Spacing.tiny,
  },
  documentDate: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  extractionErrorContainer: {
    marginTop: Spacing.medium,
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.small,
    padding: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  extractionErrorTitle: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.semibold,
    color: Colors.accent,
    marginBottom: Spacing.tiny,
  },
  extractionErrorText: {
    fontSize: Typography.size.small,
    color: Colors.black,
    lineHeight: Typography.lineHeight.normal,
  },
  sectionContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    marginBottom: Spacing.large,
    ...Shadows.medium,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  sectionTitleIcon: {
    width: 4,
    height: 20,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: Spacing.small,
  },
  authIcon: {
    backgroundColor: Colors.secondary,
  },
  sectionTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
  },
  sectionDescription: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
    marginBottom: Spacing.large,
    lineHeight: 22,
  },
  fieldsContainer: {
    marginBottom: Spacing.large,
  },
  markAllButton: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    alignItems: 'center',
    marginTop: Spacing.medium,
    ...Shadows.soft,
  },
  markAllButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  reviewerInfoContainer: {
    marginBottom: Spacing.large,
  },
  inputLabel: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.small,
    fontWeight: Typography.weight.medium,
  },
  reviewerInput: {
    backgroundColor: '#f7f9fc',
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.medium,
    borderWidth: 1,
    borderColor: '#edf0f7',
  },
  reviewDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.small,
  },
  reviewDateLabel: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    fontWeight: Typography.weight.medium,
    marginRight: Spacing.small,
  },
  reviewDate: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
  },
  generatePDFButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    alignItems: 'center',
    ...Shadows.medium,
  },
  generatePDFButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  disabledButton: {
    backgroundColor: '#cbd5e1',
    ...Shadows.none,
  },
});

export default DocumentReviewScreen;