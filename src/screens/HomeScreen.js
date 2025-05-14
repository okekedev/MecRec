/**
 * Enhanced HomeScreen component with updated UI
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import EnhancedHeader from '../components/EnhancedHeader';
import AppSideMenu from '../components/AppSideMenu';
import DocumentCard from '../components/DocumentCard';
import PDFProcessorService from '../services/PDFProcessorService';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout } from '../styles';
import * as Animations from '../animations';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const statsScale = React.useRef(new Animated.Value(0.9)).current;
  
  // Load recent documents
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        
        // Get processor service
        const processorService = PDFProcessorService.getInstance();
        
        // Load documents
        const documents = await processorService.getProcessedDocuments();
        
        // Get most recent documents
        const recent = documents
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 3);
        
        setRecentDocuments(recent);
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setLoading(false);
        
        // Animate in
        Animated.parallel([
          Animations.fadeIn(fadeAnim, 400),
          Animations.slideInUp(slideAnim, 50, 500),
          Animations.zoomIn(statsScale, 0.9, 600),
        ]).start();
      }
    };
    
    loadDocuments();
  }, []);
  
  // Toggle menu
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };
  
  // Metrics data
  const metricsData = {
    processed: recentDocuments.length,
    pendingReview: 0,
    references: recentDocuments.reduce((total, doc) => total + (doc.references || 0), 0),
  };
  
  return (
    <View style={styles.container}>
      <EnhancedHeader
        title="MedRec Dashboard"
        onMenuPress={toggleMenu}
      />
      
      <AppSideMenu
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        currentScreen="Home"
        userName="Dr. Sarah Johnson" // In a real app, this would come from user auth state
      />
      
      <SafeAreaView style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome section */}
          <Animated.View 
            style={[
              styles.welcomeSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.welcomeTitle}>
              Welcome to MedRec
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Medical Referral Document Processor
            </Text>
          </Animated.View>
          
          {/* Metrics section */}
          <Animated.View 
            style={[
              styles.metricsContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: statsScale }]
              }
            ]}
          >
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metricsData.processed}</Text>
              <Text style={styles.metricLabel}>Documents</Text>
            </View>
            
            <View style={[styles.metricCard, styles.primaryMetricCard]}>
              <Text style={[styles.metricValue, styles.primaryMetricValue]}>
                {metricsData.pendingReview}
              </Text>
              <Text style={[styles.metricLabel, styles.primaryMetricLabel]}>
                Pending Review
              </Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metricsData.references}</Text>
              <Text style={styles.metricLabel}>References</Text>
            </View>
          </Animated.View>
          
          {/* Actions section */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('DocumentUpload')}
              >
                <View style={[styles.actionIcon, styles.uploadIcon]}>
                  <View style={styles.uploadArrow} />
                </View>
                <Text style={styles.actionLabel}>Upload</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('DocumentList')}
              >
                <View style={[styles.actionIcon, styles.documentsIcon]}>
                  <View style={styles.docSquare} />
                  <View style={styles.docCorner} />
                </View>
                <Text style={styles.actionLabel}>Documents</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <View style={[styles.actionIcon, styles.settingsIcon]}>
                  <View style={styles.gearOuter} />
                  <View style={styles.gearInner} />
                </View>
                <Text style={styles.actionLabel}>Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Recent documents section */}
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Documents</Text>
              
              <TouchableOpacity
                onPress={() => navigation.navigate('DocumentList')}
              >
                <Text style={styles.seeAllButton}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading documents...</Text>
              </View>
            ) : recentDocuments.length > 0 ? (
              <View style={styles.documentsList}>
                {recentDocuments.map((document, index) => (
                  <DocumentCard
                    key={document.id || index}
                    document={document}
                    onPress={() => 
                      navigation.navigate('DocumentViewer', { 
                        uri: document.uri,
                        documentId: document.id
                      })
                    }
                    onLongPress={() => {
                      // Show document actions menu
                      // (In a real app, this would show options like delete, share, etc.)
                    }}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No documents processed yet
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('DocumentUpload')}
                >
                  <Text style={styles.emptyButtonText}>
                    Upload Document
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.large,
  },
  welcomeSection: {
    marginBottom: Spacing.large,
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
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xlarge,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    alignItems: 'center',
    marginHorizontal: Spacing.tiny,
    ...Shadows.soft,
  },
  primaryMetricCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.small,
  },
  metricValue: {
    fontSize: Typography.size.xxlarge,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
    marginBottom: Spacing.tiny,
  },
  metricLabel: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  primaryMetricValue: {
    color: Colors.white,
  },
  primaryMetricLabel: {
    color: Colors.white,
  },
  actionsSection: {
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
    width: '30%',
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
  uploadIcon: {
    backgroundColor: Colors.primaryLight,
  },
  documentsIcon: {
    backgroundColor: Colors.secondaryLight,
  },
  settingsIcon: {
    backgroundColor: Colors.accentLight,
  },
  uploadArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.primary,
  },
  docSquare: {
    width: 16,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: 2,
  },
  docCorner: {
    width: 6,
    height: 6,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.secondary,
    position: 'absolute',
    top: 2,
    right: 2,
  },
  gearOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gearInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  actionLabel: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.medium,
    color: Colors.black,
  },
  recentSection: {
    marginBottom: Spacing.large,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  seeAllButton: {
    fontSize: Typography.size.small,
    color: Colors.primary,
    fontWeight: Typography.weight.medium,
  },
  documentsList: {
    marginTop: Spacing.small,
  },
  loadingContainer: {
    padding: Spacing.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
  },
  emptyContainer: {
    padding: Spacing.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    ...Shadows.soft,
  },
  emptyText: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
    marginBottom: Spacing.large,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    borderRadius: BorderRadius.medium,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
});

export default HomeScreen;