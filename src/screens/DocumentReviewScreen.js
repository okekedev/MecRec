// Updated DocumentReviewScreen.js with AI reasoning approach
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
        
        const processorService = PDFProcessorService.getInstance();
        const document = await processorService.getDocumentById(documentId);
        
        if (!document) {
          throw new Error('Document not found');
        }
        
        console.log('Document loaded:', documentId);
        console.log('Form data fields:', Object.keys(document.formData).filter(k => !k.startsWith('_')));
        
        // Check for extraction errors
        if (document.formData.extractionMethod === 'failed' || 
            document.formData.extractionMethod === 'error' || 
            document.formData.extractionMethod === 'unavailable' ||
            document.formData.error) {
          setExtractionError(document.formData.error || 'Error during information extraction');
        }
        
        setDocumentData(document);
        
        // Set form data - filter out metadata fields
        if (document.formData) {
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
    
    navigation.navigate('PDFPreview', {
      documentId,
      formData,
      reviewerName,
      reviewerCredentials,
      reviewDate: new Date().toISOString()
    });
  };
  
  // Field label formatting
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
      'medications': 'Medications & Antibiotics',
      'cardiacDrips': 'Cardiac Medications/Drips',
      'labsAndVitals': 'Labs & Vital Signs',
      'faceToFace': 'Face-to-Face Evaluations',
      'history': 'Medical History',
      'mentalHealthState': 'Mental Health State',
      'additionalComments': 'Additional Comments'
    };
    
    return labelMap[camelCase] || camelCase
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };
  
  // Loading screen
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading medical document</Text>
          <Text style={styles.loadingSubtext}>Preparing data for review</Text>
        </View>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <EnhancedHeader 
        title="Clinical Document Review" 
        showBackButton={true}
      />
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressText}>Review Progress</Text>
          <Text style={styles.progressPercentage}>{Math.round(calculateProgress())}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <Animated.View 
            style={[
              styles.progressBar, 
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
      
      <ScrollView style={styles.scrollView}>
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          <View style={styles.content}>
            <View style={styles.documentHeader}>
              <Text style={styles.documentName}>{documentData?.name}</Text>
              <Text style={styles.documentDate}>
                Processed on {new Date(documentData?.date).toLocaleDateString()}
              </Text>
              
              {/* Extraction error warning */}
              {extractionError && (
                <View style={styles.extractionErrorContainer}>
                  <Text style={styles.extractionErrorTitle}>AI Extraction Issue</Text>
                  <Text style={styles.extractionErrorText}>
                    {extractionError}. Please review all fields carefully and update as needed.
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.sectionContainer}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionTitleIcon} />
                <Text style={styles.sectionTitle}>Clinical Information Review</Text>
              </View>
              
              <Text style={styles.sectionDescription}>
                Review and verify the extracted information below. Each field shows AI reasoning 
                to help you understand how the information was identified.
              </Text>
              
              <View style={styles.fieldsContainer}>
                {['patientName', 'patientDOB', 'insurance', 'location', 'dx', 'pcp', 'dc', 'wounds', 
                  'medications', 'cardiacDrips', 'labsAndVitals', 'faceToFace', 'history', 
                  'mentalHealthState', 'additionalComments'].map(fieldName => {
                  
                  if (!(fieldName in formData)) return null;
                  
                  // Get AI reasoning for this field
                  const processorService = PDFProcessorService.getInstance();
                  const fieldReference = processorService.getFieldReference(documentId, fieldName);
                  
                  // AI reasoning is much simpler
                  const aiReasoning = fieldReference?.explanation || 'No reasoning provided';
                  
                  // Determine if field needs multiline
                  const needsMultiline = [
                    'history', 
                    'mentalHealthState', 
                    'additionalComments',
                    'labsAndVitals',
                    'wounds',
                    'medications'
                  ].includes(fieldName);
                  
                  return (
                    <ReviewField
                      key={fieldName}
                      label={formatLabel(fieldName)}
                      value={formData[fieldName] || ''}
                      onValueChange={(newValue) => handleFieldChange(fieldName, newValue)}
                      isReviewed={reviewedFields[fieldName] || false}
                      onReviewChange={(newValue) => handleReviewToggle(fieldName, newValue)}
                      aiReasoning={aiReasoning}
                      multiline={needsMultiline}
                    />
                  );
                })}
              </View>
              
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={markAllAsReviewed}
              >
                <Text style={styles.markAllButtonText}>Mark All as Reviewed</Text>
              </TouchableOpacity>
            </View>
            
            {/* Reviewer Authentication */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionTitleContainer}>
                <View style={[styles.sectionTitleIcon, styles.authIcon]} />
                <Text style={styles.sectionTitle}>Clinician Authentication</Text>
              </View>
              
              <View style={styles.reviewerInfoContainer}>
                <Text style={styles.inputLabel}>Reviewer Name*</Text>
                <TextInput
                  style={styles.reviewerInput}
                  value={reviewerName}
                  onChangeText={setReviewerName}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.gray}
                />
                
                <Text style={styles.inputLabel}>Credentials</Text>
                <TextInput
                  style={styles.reviewerInput}
                  value={reviewerCredentials}
                  onChangeText={setReviewerCredentials}
                  placeholder="e.g., RN, BSN, CPN"
                  placeholderTextColor={Colors.gray}
                />
                
                <View style={styles.reviewDateContainer}>
                  <Text style={styles.reviewDateLabel}>Review Date:</Text>
                  <Text style={styles.reviewDate}>
                    {new Date().toLocaleDateString()}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.generatePDFButton,
                  (!allFieldsReviewed || !reviewerName.trim()) && styles.disabledButton
                ]}
                onPress={generatePDF}
                disabled={!allFieldsReviewed || !reviewerName.trim()}
              >
                <Text style={styles.generatePDFButtonText}>Generate Clinical Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
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