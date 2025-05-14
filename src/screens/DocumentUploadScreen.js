/**
 * DocumentUploadScreen.js - Modern implementation with consistent styling
 */
import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DocumentUploader from '../components/DocumentUploader';
import EnhancedHeader from '../components/EnhancedHeader';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';
import * as Animations from '../animations';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const DocumentUploadScreen = () => {
  const navigation = useNavigation();
  
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Start animations on component mount
  useEffect(() => {
    Animated.parallel([
      Animations.fadeIn(fadeAnim, 500),
      Animations.slideInUp(slideAnim, 30, 600)
    ]).start();
  }, []);

  const handleDocumentProcessed = (processedDocument) => {
    // Navigate to the document viewer with the processed document
    navigation.navigate('DocumentReview', { 
      documentId: processedDocument.id
    });
  };

  const handleProcessingError = (error) => {
    console.error('Processing error:', error);
    // Error handling could be added here
  };

  return (
    <SafeAreaView style={styles.container}>
      <EnhancedHeader
        title="Upload Medical Document"
        showBackButton={true}
        backgroundColor="#ffffff"
        textColor="#2c3e50"
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.uploadCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <View style={styles.cardTitleIcon} />
              <Text style={styles.cardTitle}>Medical Document Upload</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              Upload a medical referral PDF for AI-powered processing
            </Text>
          </View>
          
          <View style={styles.uploadSteps}>
            <View style={styles.step}>
              <View style={[styles.stepIcon, styles.uploadIcon]}>
                <MaterialIcons name="file-upload" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.stepText}>Select PDF</Text>
            </View>
            
            <View style={styles.stepConnector} />
            
            <View style={styles.step}>
              <View style={[styles.stepIcon, styles.processIcon]}>
                <MaterialIcons name="auto-fix-high" size={22} color={Colors.secondary} />
              </View>
              <Text style={styles.stepText}>Process</Text>
            </View>
            
            <View style={styles.stepConnector} />
            
            <View style={styles.step}>
              <View style={[styles.stepIcon, styles.reviewIcon]}>
                <MaterialIcons name="rate-review" size={22} color={Colors.accent} />
              </View>
              <Text style={styles.stepText}>Review</Text>
            </View>
          </View>
          
          <View style={styles.uploaderContainer}>
            <DocumentUploader 
              onDocumentProcessed={handleDocumentProcessed}
              onError={handleProcessingError}
            />
          </View>
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.infoCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.infoTitle}>Document Requirements</Text>
          <View style={styles.infoItem}>
            <FontAwesome5 name="file-pdf" size={14} color={Colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>PDF format only</Text>
          </View>
          <View style={styles.infoItem}>
            <FontAwesome5 name="weight" size={14} color={Colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Maximum size: 10MB</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="description" size={14} color={Colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Medical referrals, lab reports, and clinical notes are supported</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="text-format" size={14} color={Colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Documents will be processed using OCR if needed</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc', // Lighter, more clinical background
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.large,
    paddingBottom: Spacing.xxlarge,
  },
  uploadCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.large,
    marginBottom: Spacing.large,
    ...Shadows.medium,
  },
  cardHeader: {
    marginBottom: Spacing.large,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  cardTitleIcon: {
    width: 4,
    height: 18,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: Spacing.small,
  },
  cardTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
  },
  cardSubtitle: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
    paddingLeft: Spacing.small + 4,
    lineHeight: Typography.lineHeight.normal,
  },
  uploadSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.large,
    paddingHorizontal: Spacing.small,
  },
  step: {
    alignItems: 'center',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.small,
    ...Shadows.soft,
  },
  uploadIcon: {
    backgroundColor: Colors.primaryLight,
  },
  processIcon: {
    backgroundColor: Colors.secondaryLight,
  },
  reviewIcon: {
    backgroundColor: Colors.accentLight,
  },
  stepText: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.medium,
    color: Colors.black,
  },
  stepConnector: {
    height: 1,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: Spacing.small,
  },
  uploaderContainer: {
    width: '100%',
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    marginBottom: Spacing.medium,
    ...Shadows.soft,
  },
  infoTitle: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.medium,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  infoIcon: {
    width: 20,
    marginRight: Spacing.small,
  },
  infoText: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    lineHeight: Typography.lineHeight.normal,
    flex: 1,
  },
});

export default DocumentUploadScreen;