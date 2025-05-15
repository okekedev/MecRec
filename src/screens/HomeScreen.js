/**
 * HomeScreen.js - Modern clinical dashboard focused on document review
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import EnhancedHeader from '../components/EnhancedHeader';
import PDFProcessorService from '../services/PDFProcessorService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';
import * as Animations from '../animations';

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
  
  // Get the current date for display
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return (
    <View style={styles.container}>
      <EnhancedHeader
        title=""
        backgroundColor="#ffffff"
        textColor="#2c3e50"
        elevated={true}
      />
      
      <SafeAreaView style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome section with date */}
          <Animated.View 
            style={[
              styles.welcomeSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.welcomeContent}>
              <View>
                <Text style={styles.welcomeDate}>{currentDate}</Text>
                <Text style={styles.welcomeTitle}>
                  Medical Document Review System
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  Process, review, and generate clinical reports
                </Text>
              </View>
              
              {/* Logo from assets */}
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Image 
                    source={require('../assets/icon.png')} 
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          </Animated.View>
          
          {/* Main action card */}
          <Animated.View 
            style={[
              styles.mainActionCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: cardScale }]
              }
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <View style={styles.cardTitleIcon} />
                <Text style={styles.cardTitle}>Document Processing</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                Upload and review medical documents
              </Text>
            </View>
            
            <View style={styles.documentWorkflow}>
              <View style={styles.workflowStep}>
                <View style={[styles.stepIcon, styles.uploadIcon]}>
                  <MaterialIcons name="file-upload" size={24} color={Colors.primary} />
                </View>
                <Text style={styles.stepText}>Upload</Text>
              </View>
              
              <View style={styles.stepConnector} />
              
              <View style={styles.workflowStep}>
                <View style={[styles.stepIcon, styles.reviewIcon]}>
                  <MaterialIcons name="rate-review" size={24} color={Colors.secondary} />
                </View>
                <Text style={styles.stepText}>Review</Text>
              </View>
              
              <View style={styles.stepConnector} />
              
              <View style={styles.workflowStep}>
                <View style={[styles.stepIcon, styles.pdfIcon]}>
                  <FontAwesome5 name="file-pdf" size={22} color={Colors.accent} />
                </View>
                <Text style={styles.stepText}>Report</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.beginButton}
              onPress={() => navigation.navigate('DocumentUpload')}
            >
              <Text style={styles.beginButtonText}>Begin Document Review</Text>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Quick actions */}
          <Animated.View
            style={[
              styles.quickActions,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('DocumentUpload')}
              >
                <View style={[styles.actionIcon, styles.actionUploadIcon]}>
                  <Ionicons name="document-text-outline" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.actionLabel}>Upload & Review</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <View style={[styles.actionIcon, styles.actionSettingsIcon]}>
                  <Ionicons name="settings-outline" size={28} color={Colors.accent} />
                </View>
                <Text style={styles.actionLabel}>Settings</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          
          {/* System info section */}
          <Animated.View
            style={[
              styles.systemInfo,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.systemInfoTitle}>About MedRec</Text>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="text-recognition" size={20} color={Colors.primary} style={styles.infoIcon} />
              <Text style={styles.systemInfoText}>
                MedRec simplifies the clinical document review process by extracting key medical information for verification by healthcare professionals.
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="brain" size={20} color={Colors.primary} style={styles.infoIcon} />
              <Text style={styles.systemInfoText}>
                The system uses advanced OCR and AI to identify important clinical data points, supporting efficient and accurate medical record processing.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc', // Lighter, clinical background
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.large,
    paddingBottom: Spacing.xxlarge,
  },
  welcomeSection: {
    marginBottom: Spacing.large,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeDate: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginBottom: Spacing.small,
  },
  welcomeTitle: {
    fontSize: Typography.size.xxlarge,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
    marginBottom: Spacing.tiny,
  },
  welcomeSubtitle: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
  },
  logoContainer: {
  marginLeft: Spacing.medium,
},
logo: {
  width: 50,
  height: 50,
  borderRadius: 12,
  backgroundColor: Colors.white,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 6, // Add padding inside the container
  ...Shadows.medium,
  overflow: 'hidden',
},
logoImage: {
  width: '100%',  // This will respect the padding
  height: '100%', // This will respect the padding
},
  mainActionCard: {
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
  },
  documentWorkflow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.large,
    paddingHorizontal: Spacing.small,
  },
  workflowStep: {
    alignItems: 'center',
  },
  stepIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.small,
    ...Shadows.soft,
  },
  uploadIcon: {
    backgroundColor: '#e8f4fc', // Light blue
  },
  reviewIcon: {
    backgroundColor: '#e8f7ef', // Light green
  },
  pdfIcon: {
    backgroundColor: '#fbeae9', // Light red
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
  beginButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    alignItems: 'center',
    ...Shadows.soft,
  },
  beginButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  quickActions: {
    marginBottom: Spacing.large,
  },
  sectionTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.medium,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    alignItems: 'center',
    width: '48%',
    ...Shadows.soft,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  actionUploadIcon: {
    backgroundColor: '#e8f4fc', // Light blue
  },
  actionSettingsIcon: {
    backgroundColor: '#fbeae9', // Light red
  },
  actionLabel: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.medium,
    color: Colors.black,
  },
  systemInfo: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    ...Shadows.soft,
  },
  systemInfoTitle: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.medium,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: Spacing.medium,
  },
  infoIcon: {
    marginRight: Spacing.small,
    marginTop: 2,
  },
  systemInfoText: {
    flex: 1,
    fontSize: Typography.size.small,
    color: Colors.gray,
    lineHeight: 20,
  },
});

export default HomeScreen;