// src/screens/DocumentReviewScreen.js
import React, { useState, useEffect } from 'react';
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
  Switch
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
  
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState(null);
  const [formData, setFormData] = useState({});
  const [reviewStatus, setReviewStatus] = useState({});
  const [reviewerName, setReviewerName] = useState('');
  const [allFieldsReviewed, setAllFieldsReviewed] = useState(false);
  
  // Get processor service
  const processorService = PDFProcessorService.getInstance();
  
  // Load document data
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        
        // Get document by ID
        const document = await processorService.getDocumentById(documentId);
        
        if (!document) {
          Alert.alert('Error', 'Document not found');
          navigation.goBack();
          return;
        }
        
        setDocumentData(document);
        
        // Initialize form data from extracted data
        if (document.formData) {
          setFormData(document.formData);
          
          // Initialize review status for each field
          const initialReviewStatus = {};
          Object.keys(document.formData).forEach(field => {
            // Skip metadata fields
            if (!field.startsWith('_') && 
                field !== 'extractionMethod' && 
                field !== 'extractionDate') {
              initialReviewStatus[field] = false;
            }
          });
          
          setReviewStatus(initialReviewStatus);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading document:', error);
        Alert.alert('Error', 'Failed to load document for review');
        navigation.goBack();
      }
    };
    
    loadDocument();
  }, [documentId]);
  
  // Update allFieldsReviewed status when reviewStatus changes
  useEffect(() => {
    const reviewFields = Object.values(reviewStatus);
    const allReviewed = reviewFields.length > 0 && reviewFields.every(status => status === true);
    setAllFieldsReviewed(allReviewed);
  }, [reviewStatus]);
  
  // Handle field value change
  const handleFieldChange = (field, value) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };
  
  // Handle field review status change
  const handleReviewStatusChange = (field, isReviewed) => {
    setReviewStatus(prevStatus => ({
      ...prevStatus,
      [field]: isReviewed
    }));
  };
  
  // Mark all fields as reviewed
  const markAllAsReviewed = () => {
    const newReviewStatus = {};
    Object.keys(reviewStatus).forEach(field => {
      newReviewStatus[field] = true;
    });
    setReviewStatus(newReviewStatus);
  };
  
  // Generate PDF
  const generatePDF = async () => {
    if (!allFieldsReviewed) {
      Alert.alert('Error', 'Please review all fields before generating PDF');
      return;
    }
    
    if (!reviewerName.trim()) {
      Alert.alert('Error', 'Please enter your name before generating PDF');
      return;
    }
    
    try {
      // Navigate to PDF preview screen
      navigation.navigate('PDFPreview', {
        documentId,
        formData,
        reviewerName,
        reviewDate: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };
  
  // Calculate review progress
  const calculateProgress = () => {
    const totalFields = Object.keys(reviewStatus).length;
    if (totalFields === 0) return 0;
    
    const reviewedFields = Object.values(reviewStatus).filter(status => status).length;
    return (reviewedFields / totalFields) * 100;
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading document data...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <EnhancedHeader 
        title="Document Review" 
        showBackButton={true}
      />
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Review Progress: {Math.round(calculateProgress())}%
        </Text>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${calculateProgress()}%` }
            ]} 
          />
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.documentName}>{documentData?.name}</Text>
          
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Medical Information Review</Text>
            <Text style={styles.sectionDescription}>
              Review and verify the extracted information. Edit any incorrect data and mark each field as reviewed.
            </Text>
            
            {/* Clinical Fields */}
            <View style={styles.fieldsContainer}>
              {/* Insurance */}
              <ReviewField
                label="Insurance"
                value={formData.insurance || ''}
                onValueChange={(value) => handleFieldChange('insurance', value)}
                isReviewed={reviewStatus.insurance || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('insurance', isReviewed)}
                sourceText={formData._references?.insurance?.text}
                sourceType={formData._references?.insurance?.location}
              />
              
              {/* Location */}
              <ReviewField
                label="Location"
                value={formData.location || ''}
                onValueChange={(value) => handleFieldChange('location', value)}
                isReviewed={reviewStatus.location || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('location', isReviewed)}
                sourceText={formData._references?.location?.text}
                sourceType={formData._references?.location?.location}
              />
              
              {/* Diagnosis */}
              <ReviewField
                label="Diagnosis (Dx)"
                value={formData.dx || formData.diagnosis || ''}
                onValueChange={(value) => handleFieldChange('dx', value)}
                isReviewed={reviewStatus.dx || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('dx', isReviewed)}
                sourceText={formData._references?.dx?.text || formData._references?.diagnosis?.text}
                sourceType={formData._references?.dx?.location || formData._references?.diagnosis?.location}
              />
              
              {/* Primary Care Provider */}
              <ReviewField
                label="Primary Care Provider (PCP)"
                value={formData.pcp || ''}
                onValueChange={(value) => handleFieldChange('pcp', value)}
                isReviewed={reviewStatus.pcp || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('pcp', isReviewed)}
                sourceText={formData._references?.pcp?.text}
                sourceType={formData._references?.pcp?.location}
              />
              
              {/* Discharge */}
              <ReviewField
                label="Discharge (DC)"
                value={formData.dc || ''}
                onValueChange={(value) => handleFieldChange('dc', value)}
                isReviewed={reviewStatus.dc || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('dc', isReviewed)}
                sourceText={formData._references?.dc?.text}
                sourceType={formData._references?.dc?.location}
              />
              
              {/* Wounds */}
              <ReviewField
                label="Wounds"
                value={formData.wounds || ''}
                onValueChange={(value) => handleFieldChange('wounds', value)}
                isReviewed={reviewStatus.wounds || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('wounds', isReviewed)}
                sourceText={formData._references?.wounds?.text}
                sourceType={formData._references?.wounds?.location}
                multiline={true}
              />
              
              {/* Antibiotics */}
              <ReviewField
                label="Antibiotics"
                value={formData.antibiotics || ''}
                onValueChange={(value) => handleFieldChange('antibiotics', value)}
                isReviewed={reviewStatus.antibiotics || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('antibiotics', isReviewed)}
                sourceText={formData._references?.antibiotics?.text}
                sourceType={formData._references?.antibiotics?.location}
              />
              
              {/* Cardiac Drips */}
              <ReviewField
                label="Cardiac Drips"
                value={formData.cardiacDrips || ''}
                onValueChange={(value) => handleFieldChange('cardiacDrips', value)}
                isReviewed={reviewStatus.cardiacDrips || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('cardiacDrips', isReviewed)}
                sourceText={formData._references?.cardiacDrips?.text}
                sourceType={formData._references?.cardiacDrips?.location}
              />
              
              {/* Labs */}
              <ReviewField
                label="Labs"
                value={formData.labs || ''}
                onValueChange={(value) => handleFieldChange('labs', value)}
                isReviewed={reviewStatus.labs || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('labs', isReviewed)}
                sourceText={formData._references?.labs?.text}
                sourceType={formData._references?.labs?.location}
                multiline={true}
              />
              
              {/* Face to Face */}
              <ReviewField
                label="Face to Face"
                value={formData.faceToFace || ''}
                onValueChange={(value) => handleFieldChange('faceToFace', value)}
                isReviewed={reviewStatus.faceToFace || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('faceToFace', isReviewed)}
                sourceText={formData._references?.faceToFace?.text}
                sourceType={formData._references?.faceToFace?.location}
              />
              
              {/* History */}
              <ReviewField
                label="History"
                value={formData.history || ''}
                onValueChange={(value) => handleFieldChange('history', value)}
                isReviewed={reviewStatus.history || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('history', isReviewed)}
                sourceText={formData._references?.history?.text}
                sourceType={formData._references?.history?.location}
                multiline={true}
              />
              
              {/* Mental Health State */}
              <ReviewField
                label="Mental Health State"
                value={formData.mentalHealthState || ''}
                onValueChange={(value) => handleFieldChange('mentalHealthState', value)}
                isReviewed={reviewStatus.mentalHealthState || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('mentalHealthState', isReviewed)}
                sourceText={formData._references?.mentalHealthState?.text}
                sourceType={formData._references?.mentalHealthState?.location}
                multiline={true}
              />
              
              {/* Additional Comments */}
              <ReviewField
                label="Additional Comments"
                value={formData.additionalComments || ''}
                onValueChange={(value) => handleFieldChange('additionalComments', value)}
                isReviewed={reviewStatus.additionalComments || false}
                onReviewChange={(isReviewed) => handleReviewStatusChange('additionalComments', isReviewed)}
                sourceText={formData._references?.additionalComments?.text}
                sourceType={formData._references?.additionalComments?.location}
                multiline={true}
              />
            </View>
            
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsReviewed}
            >
              <Text style={styles.markAllButtonText}>Mark All as Reviewed</Text>
            </TouchableOpacity>
          </View>
          
          {/* Reviewer Information Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Reviewer Information</Text>
            
            <View style={styles.reviewerInfoContainer}>
              <Text style={styles.inputLabel}>Reviewer Name</Text>
              <TextInput
                style={styles.reviewerInput}
                value={reviewerName}
                onChangeText={setReviewerName}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.gray}
              />
              
              <Text style={styles.reviewDate}>
                Review Date: {new Date().toLocaleDateString()}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[
                styles.generatePDFButton,
                (!allFieldsReviewed || !reviewerName.trim()) && styles.disabledButton
              ]}
              onPress={generatePDF}
              disabled={!allFieldsReviewed || !reviewerName.trim()}
            >
              <Text style={styles.generatePDFButtonText}>
                Generate PDF Report
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.medium,
    fontSize: Typography.size.medium,
    color: Colors.gray,
  },
  progressContainer: {
    padding: Spacing.medium,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  progressText: {
    fontSize: Typography.size.small,
    color: Colors.black,
    marginBottom: Spacing.small,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.small,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.large,
  },
  documentName: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
    marginBottom: Spacing.medium,
  },
  sectionContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    marginBottom: Spacing.large,
    ...Shadows.medium,
  },
  sectionTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.small,
  },
  sectionDescription: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
    marginBottom: Spacing.large,
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
  },
  reviewerInput: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.medium,
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
  },
  generatePDFButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  disabledButton: {
    backgroundColor: Colors.gray,
    opacity: 0.7,
  },
});

export default DocumentReviewScreen;