/**
 * HomeScreen.js - Modern clinical dashboard focused on document review
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import PDFProcessorService from '../services/PDFProcessorService';
import MedicalFieldService from '../services/MedicalFieldService';
import { Colors, CommonStyles } from '../styles';
import * as Animations from '../animations';
import Footer from '../components/Footer';

// Import icons from Expo vector icons
import { 
  MaterialIcons, 
  FontAwesome5, 
  Ionicons, 
  MaterialCommunityIcons 
} from '@expo/vector-icons';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  
  // Start animations on component mount
  useEffect(() => {
    Animated.parallel([
      Animations.fadeIn(fadeAnim, 500),
      Animations.slideInUp(slideAnim, 30, 600),
      Animations.zoomIn(cardScale, 0.95, 700)
    ]).start();
  }, []);
  
  // NEW: Handle blank form navigation
  const handleBlankFormPress = () => {
    // Create a blank document entry for the review screen
    const blankDocumentId = 'blank_' + Date.now().toString();
    
    // Get medical field service to create empty form data
    const medicalFieldService = MedicalFieldService.getInstance();
    const emptyFormData = medicalFieldService.createEmptyFormData();
    
    // Create a mock document object for blank form
    const blankDocument = {
      id: blankDocumentId,
      name: 'HHHC Referral Form',
      date: new Date().toISOString().split('T')[0],
      uri: null, // No actual document
      extractedText: '',
      isOcr: false,
      ocrConfidence: null,
      pages: 0,
      formData: emptyFormData,
      hasHighlighting: false,
      positionSource: 'blank'
    };
    
    // Store the blank document temporarily in the processor service
    const pdfProcessor = PDFProcessorService.getInstance();
    pdfProcessor.documentsCache.set(blankDocumentId, blankDocument);
    
    // Navigate to document review with the blank document
    navigation.navigate('DocumentReview', { 
      documentId: blankDocumentId,
      isBlankForm: true // Flag to indicate this is a blank form
    });
  };
  
  // Get the current date for display
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return (
    <View style={CommonStyles.homeContainer}>
      <Header
        title=""
        backgroundColor="#ffffff"
        textColor="#2c3e50"
        elevated={true}
      />
      
      <SafeAreaView style={CommonStyles.homeContent}>
        <ScrollView
          style={CommonStyles.homeScrollView}
          contentContainerStyle={CommonStyles.homeScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome section with date */}
          <Animated.View 
            style={[
              CommonStyles.homeWelcomeSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={CommonStyles.homeWelcomeContent}>
              <View>
                <Text style={CommonStyles.homeWelcomeDate}>{currentDate}</Text>
                <Text style={CommonStyles.homeWelcomeTitle}>
                  Medical Referral Platform
                </Text>
                <Text style={CommonStyles.homeWelcomeSubtitle}>
                  Process, review, and generate referral summaries
                </Text>
              </View>
              
              {/* Logo from assets */}
              <View style={CommonStyles.homeLogoContainer}>
                <View style={CommonStyles.homeLogo}>
                  <Image 
                    source={require('../assets/icon.png')} 
                    style={CommonStyles.homeLogoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          </Animated.View>
          
          {/* Main action card */}
          <Animated.View 
            style={[
              CommonStyles.homeMainActionCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: cardScale }]
              }
            ]}
          >
            <View style={CommonStyles.homeCardHeader}>
              <View style={CommonStyles.homeCardTitleContainer}>
                <View style={CommonStyles.homeCardTitleIcon} />
                <Text style={CommonStyles.homeCardTitle}>Document Processing</Text>
              </View>
              <Text style={CommonStyles.homeCardSubtitle}>
                Upload and review medical documents
              </Text>
            </View>
            
            <View style={CommonStyles.homeDocumentWorkflow}>
              <View style={CommonStyles.homeWorkflowStep}>
                <View style={[CommonStyles.homeStepIcon, CommonStyles.homeUploadIcon]}>
                  <MaterialIcons name="file-upload" size={24} color={Colors.primary} />
                </View>
                <Text style={CommonStyles.homeStepText}>Upload</Text>
              </View>
              
              <View style={CommonStyles.homeStepConnector} />
              
              <View style={CommonStyles.homeWorkflowStep}>
                <View style={[CommonStyles.homeStepIcon, CommonStyles.homeReviewIcon]}>
                  <MaterialIcons name="rate-review" size={24} color={Colors.secondary} />
                </View>
                <Text style={CommonStyles.homeStepText}>Review</Text>
              </View>
              
              <View style={CommonStyles.homeStepConnector} />
              
              <View style={CommonStyles.homeWorkflowStep}>
                <View style={[CommonStyles.homeStepIcon, CommonStyles.homePdfIcon]}>
                  <FontAwesome5 name="file-pdf" size={22} color={Colors.accent} />
                </View>
                <Text style={CommonStyles.homeStepText}>Report</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={CommonStyles.homeBeginButton}
              onPress={() => navigation.navigate('DocumentUpload')}
            >
              <Text style={CommonStyles.homeBeginButtonText}>Begin Document Review</Text>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Quick actions - UPDATED */}
          <Animated.View
            style={[
              CommonStyles.homeQuickActions,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={CommonStyles.homeSectionTitle}>Quick Actions</Text>
            
            <View style={CommonStyles.homeActionButtonsContainer}>
              <TouchableOpacity
                style={CommonStyles.homeActionButton}
                onPress={() => navigation.navigate('DocumentUpload')}
              >
                <View style={[CommonStyles.homeActionIcon, CommonStyles.homeActionUploadIcon]}>
                  <Ionicons name="document-text-outline" size={28} color={Colors.primary} />
                </View>
                <Text style={CommonStyles.homeActionLabel}>Upload & Review</Text>
              </TouchableOpacity>
              
              {/* UPDATED: Add onPress handler for blank form */}
              <TouchableOpacity
                style={CommonStyles.homeActionButton}
                onPress={handleBlankFormPress}
              >
                <View style={[CommonStyles.homeActionIcon, CommonStyles.homeActionFillFormIcon]}>
                  <MaterialIcons name="edit-document" size={28} color={Colors.secondary} />
                </View>
                <Text style={CommonStyles.homeActionLabel}>Blank Form</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          
          {/* System info section */}
          <Animated.View
            style={[
              CommonStyles.homeSystemInfo,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={CommonStyles.homeSystemInfoTitle}>About MedRec</Text>
            
            <View style={CommonStyles.homeInfoRow}>
              <MaterialCommunityIcons name="text-recognition" size={20} color={Colors.primary} style={CommonStyles.homeInfoIcon} />
              <Text style={CommonStyles.homeSystemInfoText}>
                MedRec simplifies the clinical document review process by extracting key medical information for verification by healthcare professionals.
              </Text>
            </View>
            
            <View style={CommonStyles.homeInfoRow}>
              <MaterialCommunityIcons name="brain" size={20} color={Colors.primary} style={CommonStyles.homeInfoIcon} />
              <Text style={CommonStyles.homeSystemInfoText}>
                The system uses advanced OCR and AI to identify important clinical data points, supporting efficient and accurate medical record processing.
              </Text>
            </View>
           

          </Animated.View>
        </ScrollView>
      </SafeAreaView>
      <Footer />
    </View>
  );
};

export default HomeScreen;