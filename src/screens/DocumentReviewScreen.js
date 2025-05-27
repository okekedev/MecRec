// src/screens/DocumentReviewScreen.js - Using consolidated styles
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
  Animated
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import PDFProcessorService from '../services/PDFProcessorService';
import MedicalFieldService from '../services/MedicalFieldService';
import EnhancedHeader from '../components/EnhancedHeader';
import ReviewField from '../components/ReviewField';
import { Colors, CommonStyles } from '../styles';
import * as Animations from '../animations';

const DocumentReviewScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { documentId } = route.params;
  
  // Services
  const pdfProcessor = PDFProcessorService.getInstance();
  const medicalFieldService = MedicalFieldService.getInstance();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState(null);
  const [formData, setFormData] = useState({});
  const [reviewedFields, setReviewedFields] = useState({});
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerCredentials, setReviewerCredentials] = useState('');
  const [extractionError, setExtractionError] = useState('');
  
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Load document data
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
        
        // Initialize reviewed fields for all known fields
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
  
  // Update field value
  const handleFieldChange = (fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };
  
  // Toggle field review status
  const handleReviewToggle = (fieldKey, value) => {
    setReviewedFields(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };
  
  // Calculate progress
  const calculateProgress = () => {
    const fieldOrder = medicalFieldService.getFieldOrder();
    const total = fieldOrder.length;
    const reviewed = fieldOrder.filter(fieldKey => reviewedFields[fieldKey]).length;
    
    return total > 0 ? reviewed / total : 0;
  };
  
  // Check if all fields are reviewed
  const allFieldsReviewed = () => {
    const fieldOrder = medicalFieldService.getFieldOrder();
    return fieldOrder.every(fieldKey => reviewedFields[fieldKey]);
  };
  
  // Mark all fields as reviewed
  const markAllAsReviewed = () => {
    const allReviewed = {};
    medicalFieldService.getFieldOrder().forEach(fieldKey => {
      allReviewed[fieldKey] = true;
    });
    setReviewedFields(allReviewed);
  };
  
  // Generate PDF
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
  
  // Get progress color based on completion
  const getProgressColor = () => {
    const progress = calculateProgress();
    if (progress < 0.3) return Colors.warning;
    if (progress < 0.7) return Colors.info;
    return Colors.success;
  };
  
  // Loading screen using consolidated styles
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f9fc' }}>
      <EnhancedHeader 
        title="Clinical Document Review" 
        showBackButton={true}
      />
      
      {/* Progress Header using consolidated styles */}
      <View style={CommonStyles.headerContainer}>
        <View style={CommonStyles.headerTextContainer}>
          <Text style={CommonStyles.headerText}>Review Progress</Text>
          <Text style={CommonStyles.headerPercentage}>{progressPercent}%</Text>
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
      
      <ScrollView style={{ flex: 1 }}>
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          padding: 20
        }}>
          {/* Document Header using consolidated styles */}
          <View style={CommonStyles.sectionContainer}>
            <Text style={CommonStyles.sectionTitle}>{documentData?.name}</Text>
            <Text style={[CommonStyles.sectionDescription, { marginBottom: 0 }]}>
              Processed on {new Date(documentData?.date).toLocaleDateString()}
            </Text>
            
            {/* Extraction error warning using consolidated message styles */}
            {extractionError && (
              <View style={CommonStyles.errorContainer}>
                <Text style={[CommonStyles.messageTitle, CommonStyles.errorTitle]}>AI Extraction Issue</Text>
                <Text style={CommonStyles.messageText}>
                  {extractionError}. Please review all fields carefully and update as needed.
                </Text>
              </View>
            )}
          </View>
          
          {/* Clinical Information Section using consolidated styles */}
          <View style={CommonStyles.sectionContainer}>
            <View style={CommonStyles.sectionTitleContainer}>
              <View style={CommonStyles.sectionTitleIcon} />
              <Text style={CommonStyles.sectionTitle}>Clinical Information Review</Text>
            </View>
            
            <Text style={CommonStyles.sectionDescription}>
              Review and verify the extracted information below. Each field shows AI reasoning 
              to help you understand how the information was identified.
            </Text>
            
            <View style={{ marginBottom: 20 }}>
              {/* Use service to get ordered fields */}
              {fieldOrder.map(fieldKey => {
                // Get AI reasoning for this field
                const fieldReference = pdfProcessor.getFieldReference(documentId, fieldKey);
                const aiReasoning = fieldReference?.explanation || 'No reasoning provided';
                
                return (
                  <ReviewField
                    key={fieldKey}
                    fieldKey={fieldKey}
                    value={formData[fieldKey] || ''}
                    onValueChange={(newValue) => handleFieldChange(fieldKey, newValue)}
                    isReviewed={reviewedFields[fieldKey] || false}
                    onReviewChange={(newValue) => handleReviewToggle(fieldKey, newValue)}
                    aiReasoning={aiReasoning}
                  />
                );
              })}
            </View>
            
            <TouchableOpacity
              style={CommonStyles.secondaryButton}
              onPress={markAllAsReviewed}
            >
              <Text style={CommonStyles.secondaryButtonText}>Mark All as Reviewed</Text>
            </TouchableOpacity>
          </View>
          
          {/* Reviewer Authentication using consolidated styles */}
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
                <Text style={[CommonStyles.inputLabel, { marginBottom: 0, marginRight: 10 }]}>Review Date:</Text>
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
            >
              <Text style={CommonStyles.primaryButtonText}>Generate Clinical Report</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DocumentReviewScreen;