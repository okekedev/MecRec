/**
 * Enhanced DocumentUploadScreen with theme and animations
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import EnhancedHeader from '../components/EnhancedHeader';
import AppSideMenu from '../components/AppSideMenu';
import OCRProgressIndicator from '../components/OCRProgressIndicator';
import PDFProcessorService from '../services/PDFProcessorService';
import PDFTextExtractionService from '../services/PDFTextExtractionService';
import { pickPdfDocument, saveDocumentToAppStorage } from '../utils/documentUtils';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';
import * as Animations from '../animations';

const DocumentUploadScreen = () => {
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [document, setDocument] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Handle animation when component mounts
  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animations.fadeIn(fadeAnim, 500),
      Animations.slideInUp(slideAnim, 50, 600),
    ]).start();
    
    // Set up OCR progress callback
    const textExtractionService = PDFTextExtractionService.getInstance();
    textExtractionService.setProgressCallback(setOcrProgress);
    
    return () => {
      // Clean up callback when unmounting
      textExtractionService.setProgressCallback(null);
    };
  }, []);
  
  // Handle document pick
  const handleDocumentPick = async () => {
    try {
      const pickedDocument = await pickPdfDocument();
      
      if (pickedDocument) {
        setDocument(pickedDocument);
        
        // Animate button when document selected
        Animations.pulse(buttonScale).start();
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };
  
  // Handle document processing
  const handleProcessDocument = async () => {
    if (!document) {
      Alert.alert('Error', 'Please select a document first');
      return;
    }
    
    try {
      setProcessing(true);
      
      // Save document to app storage if needed
      let localPath = document.localPath;
      if (!localPath) {
        const savedPath = await saveDocumentToAppStorage(document.uri, document.name);
        
        if (!savedPath) {
          throw new Error('Failed to save document to app storage');
        }
        
        localPath = savedPath;
      }
      
      // Process the document
      const processorService = PDFProcessorService.getInstance();
      const processedDocument = await processorService.processDocument(
        localPath,
        document.name
      );
      
      // Navigate to document viewer
      navigation.navigate('DocumentViewer', {
        uri: processedDocument.uri,
        documentId: processedDocument.id
      });
      
    } catch (error) {
      console.error('Error processing document:', error);
      Alert.alert('Error', 'Failed to process document');
    } finally {
      setProcessing(false);
      setOcrProgress(null);
    }
  };
  
  // Toggle menu
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };
  
  return (
    <View style={styles.container}>
      <EnhancedHeader
        title="Upload Document"
        showBackButton={true}
        onMenuPress={toggleMenu}
      />
      
      <AppSideMenu
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        currentScreen="DocumentUpload"
      />
      
      <SafeAreaView style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.uploadContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.title}>Upload Medical Document</Text>
            <Text style={styles.subtitle}>
              Select a PDF medical referral document to process. 
              The document will be analyzed using OCR technology.
            </Text>
            
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={handleDocumentPick}
              disabled={processing}
            >
              <View style={styles.uploadIconContainer}>
                <View style={styles.uploadIcon}>
                  <View style={styles.uploadArrow} />
                  <View style={styles.uploadBase} />
                </View>
              </View>
              <Text style={styles.uploadText}>
                {document ? 'Change Document' : 'Select PDF Document'}
              </Text>
              <Text style={styles.uploadHint}>
                Tap to browse files
              </Text>
            </TouchableOpacity>
            
            {document && (
              <View style={styles.documentInfo}>
                <Text style={styles.documentName} numberOfLines={1} ellipsizeMode="middle">
                  {document.name}
                </Text>
                <Text style={styles.documentSize}>
                  {Math.round(document.size / 1024)} KB
                </Text>
              </View>
            )}
            
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.processButton,
                  (!document || processing) && styles.disabledButton
                ]}
                onPress={handleProcessDocument}
                disabled={!document || processing}
              >
                {processing ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.processButtonText}>
                    Process Document
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
          
          <Animated.View
            style={[
              styles.infoSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.infoTitle}>About Document Processing</Text>
            <Text style={styles.infoText}>
              MedRec uses advanced OCR technology to extract text from medical 
              referral documents. The processing is done entirely on your device, 
              ensuring privacy and HIPAA compliance.
            </Text>
            <Text style={styles.infoText}>
              After processing, you'll be able to:
            </Text>
            <View style={styles.bulletPoints}>
              <View style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>View extracted text</Text>
              </View>
              <View style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>Ask questions about the document</Text>
              </View>
              <View style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>Extract structured form data</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
      
      {/* OCR Progress Overlay */}
      {ocrProgress && <OCRProgressIndicator progress={ocrProgress} />}
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
  uploadContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    marginBottom: Spacing.large,
    ...Shadows.medium,
  },
  title: {
    fontSize: Typography.size.xlarge,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
    marginBottom: Spacing.small,
  },
  subtitle: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
    marginBottom: Spacing.large,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.medium,
    padding: Spacing.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  uploadIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.medium,
    ...Shadows.soft,
  },
  uploadIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.primary,
    marginBottom: 2,
  },
  uploadBase: {
    width: 24,
    height: 3,
    backgroundColor: Colors.primary,
  },
  uploadText: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.small,
  },
  uploadHint: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  documentInfo: {
    backgroundColor: Colors.lightGray,
    padding: Spacing.medium,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.medium,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentName: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.medium,
    color: Colors.black,
    flex: 1,
  },
  documentSize: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginLeft: Spacing.small,
  },
  processButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    marginTop: Spacing.large,
    ...Shadows.soft,
  },
  processButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  disabledButton: {
    backgroundColor: Colors.gray,
    opacity: 0.7,
  },
  infoSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    marginBottom: Spacing.large,
    ...Shadows.soft,
  },
  infoTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.medium,
  },
  infoText: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.medium,
    lineHeight: Typography.lineHeight.normal,
  },
  bulletPoints: {
    marginBottom: Spacing.medium,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: Spacing.small,
  },
  bulletText: {
    fontSize: Typography.size.medium,
    color: Colors.black,
  },
});

export default DocumentUploadScreen;