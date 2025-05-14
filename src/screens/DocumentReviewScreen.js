// src/screens/DocumentReviewScreen.js (UI modernization)
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
  // Existing state variables and functions...
  
  // Add animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Update useEffect to include animations
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        
        // Existing document loading code...
        
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
            </View>
            
            <View style={modernStyles.sectionContainer}>
              <View style={modernStyles.sectionTitleContainer}>
                <View style={modernStyles.sectionTitleIcon} />
                <Text style={modernStyles.sectionTitle}>Clinical Information Review</Text>
              </View>
              
              <Text style={modernStyles.sectionDescription}>
                Review and verify the extracted information below. Edit any incorrect data and mark each field as reviewed when complete.
              </Text>
              
              {/* Existing fields container... */}
              
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