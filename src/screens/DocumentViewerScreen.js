/**
 * Enhanced DocumentViewerScreen with theme and animations
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import EnhancedHeader from '../components/EnhancedHeader';
import PDFViewer from '../components/PDFViewer';
import PDFProcessorService from '../services/PDFProcessorService';
import AppSideMenu from '../components/AppSideMenu';
import { Colors, Typography, Spacing, BorderRadius, Shadows, ZIndex } from '../styles';
import * as Animations from '../animations';

const DocumentViewerScreen = () => {
  const route = useRoute();
  const { uri, documentId } = route.params;
  const navigation = useNavigation();
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [extractedText, setExtractedText] = useState(null);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [docId, setDocId] = useState(documentId);
  const [documentData, setDocumentData] = useState(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScaleAnim = useRef(new Animated.Value(0.9)).current;

  // PDF source object
  const source = { uri };
  
  // Load document details if we have a document ID
  useEffect(() => {
    const loadDocumentDetails = async () => {
      if (docId) {
        try {
          const processorService = PDFProcessorService.getInstance();
          const document = await processorService.getDocumentById(docId);
          
          if (document) {
            setExtractedText(document.extractedText);
            setDocumentData(document);
          }
          
          // Start animations
          Animated.parallel([
            Animations.fadeIn(fadeAnim, 400),
            Animations.slideInUp(slideAnim, 30, 500),
            Animations.zoomIn(buttonScaleAnim, 0.9, 600),
          ]).start();
        } catch (error) {
          console.error('Error loading document details:', error);
        }
      }
    };
    
    loadDocumentDetails();
  }, [docId]);

  // Handle PDF load complete
  const onLoadComplete = (numberOfPages) => {
    setLoading(false);
    setTotalPages(numberOfPages);
    
    // If we don't have extracted text yet (no document ID was provided),
    // we'll use a placeholder
    if (!extractedText) {
      setExtractedText("Sample extracted text from the PDF document. This would be the actual text extracted via OCR and direct text extraction during the document processing stage.");
    }
  };

  // Handle page change
  const onPageChanged = (page) => {
    setCurrentPage(page);
  };

  // Toggle text view
  const toggleTextView = () => {
    setShowExtractedText(!showExtractedText);
    
    // Animate the button press
    Animations.pulse(buttonScaleAnim).start();
  };
  
  // Navigate to chat
  const navigateToChat = () => {
    if (docId) {
      navigation.navigate('DocumentChat', { documentId: docId });
    } else {
      // If we don't have a document ID, we'll show an error
      Alert.alert(
        'Document Not Processed',
        'Please process the document first before using the chat feature.'
      );
    }
  };
  
  // Toggle menu
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  return (
    <View style={styles.container}>
      <EnhancedHeader
        title="Document Viewer"
        showBackButton={true}
        onMenuPress={toggleMenu}
      />
      
      <AppSideMenu
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        currentScreen="DocumentViewer"
      />
      
      <SafeAreaView style={styles.content}>
        <Animated.View 
          style={[
            styles.pageInfoContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Text style={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </Text>
          
          {documentData && (
            <Text style={styles.documentName} numberOfLines={1}>
              {documentData.name}
            </Text>
          )}
        </Animated.View>
        
        <View style={styles.contentContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
              <Text style={styles.loadingText}>Loading document...</Text>
            </View>
          )}
          
          {!showExtractedText ? (
            <Animated.View 
              style={[
                styles.pdfContainer,
                { opacity: fadeAnim }
              ]}
            >
              <PDFViewer
                source={source}
                onLoadComplete={onLoadComplete}
                onPageChanged={onPageChanged}
                onError={(error) => {
                  console.log(error);
                  setLoading(false);
                  Alert.alert('Error', 'Failed to load document');
                }}
                style={styles.pdf}
              />
            </Animated.View>
          ) : (
            <Animated.View 
              style={[
                styles.textContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              <ScrollView 
                style={styles.textScrollView}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.extractedText}>{extractedText}</Text>
              </ScrollView>
            </Animated.View>
          )}
        </View>
        
        <Animated.View 
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity 
              style={styles.button}
              onPress={toggleTextView}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {showExtractedText ? 'View PDF' : 'View Extracted Text'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          
          <TouchableOpacity 
            style={[styles.button, styles.chatButton]}
            onPress={navigateToChat}
            disabled={!docId}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Ask Questions</Text>
          </TouchableOpacity>
        </Animated.View>
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
  pageInfoContainer: {
    paddingVertical: Spacing.small,
    paddingHorizontal: Spacing.medium,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.soft,
  },
  pageInfo: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  documentName: {
    fontSize: Typography.size.small,
    color: Colors.black,
    fontWeight: Typography.weight.medium,
    maxWidth: '60%',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  pdf: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: ZIndex.overlay,
  },
  spinner: {
    marginBottom: Spacing.medium,
  },
  loadingText: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
  },
  textContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  textScrollView: {
    flex: 1,
    padding: Spacing.large,
  },
  extractedText: {
    fontSize: Typography.size.medium,
    lineHeight: Typography.lineHeight.normal,
    color: Colors.black,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.medium,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    ...Shadows.medium,
  },
  button: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.medium,
    borderRadius: BorderRadius.medium,
    marginHorizontal: Spacing.tiny,
    alignItems: 'center',
    ...Shadows.soft,
  },
  chatButton: {
    backgroundColor: Colors.secondary,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
});

export default DocumentViewerScreen;