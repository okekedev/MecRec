// src/screens/PDFPreviewScreen.js - Enhanced with better layout and multi-page support
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Animated,
  Alert,
  Image
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import EnhancedHeader from '../components/Header';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';
import * as FileSystem from 'expo-file-system';
import { isWeb } from '../utils/platform';

// For web PDF generation
import jsPDF from 'jspdf';

const PDFPreviewScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { documentId, formData, reviewerName, reviewerCredentials, reviewDate } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Generate PDF preview on mount
  useEffect(() => {
    const generatePdfPreview = async () => {
      try {
        setLoading(true);
        
        // Web uses different PDF rendering than native
        if (isWeb) {
          await generateWebPdfPreview();
        } else {
          // For native, we'd implement a different approach
          // This is a placeholder
          setTimeout(() => {
            setLoading(false);
          }, 1000);
        }
        
        // Start animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (error) {
        console.error('Error generating PDF preview:', error);
        setLoading(false);
      }
    };
    
    generatePdfPreview();
  }, []);
  
  // Helper function to convert logo to data URL for PDF
  const getLogoAsDataUrl = async () => {
    // For web, create a canvas to draw the image and get a data URL
    return new Promise((resolve, reject) => {
      try {
        if (!isWeb) {
          // For native platforms, this would be handled differently
          resolve(null);
          return;
        }
        
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas dimensions to match the image's aspect ratio
          const aspectRatio = img.width / img.height;
          canvas.width = 300; // A reasonably high resolution
          canvas.height = canvas.width / aspectRatio;
          
          // Draw the image on the canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Get the data URL
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        };
        
        img.onerror = (e) => {
          console.error('Error loading logo image', e);
          // Resolve with null to trigger fallback
          resolve(null);
        };
        
        // Set the source to the logo (dynamically)
        // We need to use a dynamic require for the Image web implementation
        const logoModule = require('../assets/medreclogo.png');
        img.src = logoModule.default || logoModule;
      } catch (error) {
        console.error('Error in getLogoAsDataUrl', error);
        resolve(null);
      }
    });
  };
  
  // Enhanced PDF generation with better layout and multi-page support
  const generateWebPdfPreview = async () => {
    try {
      // Create a new jsPDF instance with professional settings
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });
      
      // Page dimensions and margins
      const pageWidth = 216; // Letter width in mm
      const pageHeight = 279; // Letter height in mm
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      const bottomMargin = 25; // Space for footer
      const availableHeight = pageHeight - margin - bottomMargin;
      
      let currentY = margin;
      
      // Helper function to check if we need a new page
      const checkPageBreak = (neededSpace) => {
        if (currentY + neededSpace > availableHeight) {
          doc.addPage();
          currentY = margin;
          return true;
        }
        return false;
      };
      
      // Helper function to add a section separator line
      const addSectionSeparator = () => {
        currentY += 5; // Space before line
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, currentY, margin + contentWidth, currentY);
        currentY += 8; // Space after line
      };
      
      // Try to get the logo as data URL
      const logoDataUrl = await getLogoAsDataUrl();
      
      // HEADER SECTION
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', margin, currentY, 40, 15);
        currentY += 20;
      } else {
        // SIMPLIFIED FALLBACK - just blue text
        doc.setTextColor(41, 128, 185);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('MedRec', margin, currentY + 12);
        currentY += 20;
      }
      
      // Document title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(41, 128, 185);
      doc.text('Medical Document Review Report', margin, currentY);
      currentY += 10;
      
      // Document metadata
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Document ID: ${documentId}`, margin, currentY);
      currentY += 4;
      doc.text(`Review Date: ${new Date(reviewDate).toLocaleDateString()}`, margin, currentY);
      currentY += 8;
      
      // Main separator line after header
      addSectionSeparator();
      
      // PATIENT INFORMATION SECTION (if available)
      if (formData.patientName || formData.patientDOB) {
        checkPageBreak(25); // Check if we need space for patient section
        
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(margin, currentY, contentWidth, 15, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text('Patient Information:', margin + 5, currentY + 8);
        
        let patientInfo = '';
        if (formData.patientName) {
          patientInfo += formData.patientName;
        }
        if (formData.patientDOB) {
          patientInfo += (patientInfo ? ' | DOB: ' : '') + formData.patientDOB;
        }
        
        doc.setFont('helvetica', 'normal');
        doc.text(patientInfo, margin + 50, currentY + 8);
        currentY += 20;
        
        addSectionSeparator();
      }
      
      // REVIEWER INFORMATION SECTION
      checkPageBreak(25); // Check if we need space for reviewer section
      
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(margin, currentY, contentWidth, 15, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text('Reviewed By:', margin + 5, currentY + 8);
      doc.setFont('helvetica', 'normal');
      
      let reviewerInfo = reviewerName;
      if (reviewerCredentials && reviewerCredentials.trim()) {
        reviewerInfo += `, ${reviewerCredentials}`;
      }
      
      doc.text(reviewerInfo, margin + 35, currentY + 8);
      currentY += 20;
      
      addSectionSeparator();
      
      // CLINICAL FIELDS SECTION
      const addField = (label, value) => {
        if (!value || value.trim() === '') return;
        
        // Skip patient info fields as they're shown at the top
        if (label === 'Patient Name' || label === 'Date of Birth') return;
        
        // Estimate space needed for this field
        const valuePieces = doc.splitTextToSize(value, contentWidth);
        const fieldHeight = 10 + (valuePieces.length * 5) + 10; // Label + content + spacing
        
        // Check if we need a new page
        checkPageBreak(fieldHeight);
        
        // Field label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text(`${label}:`, margin, currentY);
        currentY += 6;
        
        // Field value
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.text(valuePieces, margin, currentY);
        currentY += (valuePieces.length * 5) + 5;
        
        // Light separator line between fields (not overlapping)
        if (currentY < availableHeight - 15) { // Only add if not near bottom
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.2);
          doc.line(margin, currentY, margin + contentWidth, currentY);
          currentY += 8;
        }
      };
      
      // Field name to label mapping function
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
      
      // Add section header for clinical information
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(41, 128, 185);
      doc.text('Clinical Information', margin, currentY);
      currentY += 10;
      
      // Organize fields by priority/category
      const fieldOrder = [
        // Primary information
        'insurance', 'location', 'dx', 'pcp', 'dc',
        // Clinical details  
        'wounds', 'medications', 'cardiacDrips', 'labsAndVitals',
        // Assessment details
        'faceToFace', 'history', 'mentalHealthState', 'additionalComments'
      ];
      
      // Add all fields in organized order
      fieldOrder.forEach(fieldKey => {
        if (formData[fieldKey]) {
          addField(formatLabel(fieldKey), formData[fieldKey]);
        }
      });
      
      // Add any remaining fields not in the ordered list
      Object.entries(formData).forEach(([fieldKey, value]) => {
        if (!fieldOrder.includes(fieldKey) && 
            !['extractionMethod', 'extractionDate', 'patientName', 'patientDOB'].includes(fieldKey) &&
            value && value.trim() !== '') {
          addField(formatLabel(fieldKey), value);
        }
      });
      
      // ADD FOOTER TO ALL PAGES
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 20, margin + contentWidth, pageHeight - 20);
        
        // Footer text
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} by MedRec Clinical Review System`, 
          margin, 
          pageHeight - 15
        );
        doc.text(
          `Page ${i} of ${pageCount}`, 
          margin + contentWidth - 25, 
          pageHeight - 15
        );
      }
      
      // Get the PDF data URL for preview
      const pdfDataUrl = doc.output('dataurlstring');
      setPdfUrl(pdfDataUrl);
      setLoading(false);
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      setLoading(false);
    }
  };
  
  // Download the PDF
  const downloadPdf = async () => {
    try {
      setGeneratingPdf(true);
      
      if (isWeb) {
        // For web, create and trigger download link
        const link = document.createElement('a');
        link.href = pdfUrl;
        
        // Include patient name in filename if available
        const filename = formData.patientName ? 
          `Medical_Review_${formData.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf` : 
          `Medical_Review_${new Date().toISOString().slice(0, 10)}.pdf`;
          
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success alert for web
        setTimeout(() => {
          Alert.alert('Success', 'PDF downloaded successfully');
        }, 500);
      } else {
        // For native, save to FileSystem
        // This is a placeholder - would need proper implementation
        const filename = formData.patientName ? 
          `Medical_Review_${formData.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf` : 
          `Medical_Review_${new Date().toISOString().slice(0, 10)}.pdf`;
          
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, pdfUrl, { 
          encoding: FileSystem.EncodingType.Base64 
        });
        
        // Show success message
        Alert.alert('Success', `PDF saved to ${fileUri}`);
      }
      
      setGeneratingPdf(false);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setGeneratingPdf(false);
      Alert.alert('Error', 'Failed to download PDF');
    }
  };
  
  return (
    <SafeAreaView style={modernStyles.container}>
      <EnhancedHeader
        title=""
        showBackButton={true}
        showLogo={true}
      />
      
      <View style={modernStyles.content}>
        {loading ? (
          <View style={modernStyles.loadingContainer}>
            <View style={modernStyles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={modernStyles.loadingText}>Generating Clinical Report</Text>
              <Text style={modernStyles.loadingSubtext}>Preparing PDF preview...</Text>
            </View>
          </View>
        ) : (
          <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}>
            <View style={modernStyles.previewHeader}>
              <View style={modernStyles.previewTitleContainer}>
                <View style={modernStyles.previewIcon} />
                <Text style={modernStyles.previewTitle}>Clinical Document Report</Text>
              </View>
              <Text style={modernStyles.previewDescription}>
                Review the report below and download the PDF for your records.
              </Text>
            </View>
            
            {isWeb && pdfUrl ? (
              <View style={modernStyles.pdfContainer}>
                <iframe
                  src={pdfUrl}
                  style={modernStyles.pdfFrame}
                  title="PDF Preview"
                />
              </View>
            ) : (
              <ScrollView style={modernStyles.previewContainer}>
                <View style={modernStyles.previewContent}>
                  <View style={modernStyles.reportHeader}>
                    <View style={modernStyles.logoPlaceholder}>
                      <Image 
                        source={require('../assets/MedRecLogo.png')} 
                        style={modernStyles.logoImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={modernStyles.reportTitleContainer}>
                      <Text style={modernStyles.reportTitle}>HHHC Referral Review</Text>
                      <Text style={modernStyles.reportDate}>
                        Generated on {new Date().toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Patient Information Section */}
                  {(formData.patientName || formData.patientDOB) && (
                    <View style={modernStyles.patientInfoContainer}>
                      <Text style={modernStyles.patientLabel}>Patient:</Text>
                      <View style={modernStyles.patientDetails}>
                        {formData.patientName && (
                          <Text style={modernStyles.patientName}>{formData.patientName}</Text>
                        )}
                        {formData.patientDOB && (
                          <Text style={modernStyles.patientDOB}>DOB: {formData.patientDOB}</Text>
                        )}
                      </View>
                    </View>
                  )}
                  
                  <View style={modernStyles.reviewerInfoContainer}>
                    <Text style={modernStyles.reviewerLabel}>Reviewed By:</Text>
                    <Text style={modernStyles.reviewerName}>{reviewerName}</Text>
                    {reviewerCredentials && (
                      <Text style={modernStyles.reviewerCredentials}>{reviewerCredentials}</Text>
                    )}
                    <Text style={modernStyles.reviewDate}>
                      on {new Date(reviewDate).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <View style={modernStyles.divider} />
                  
                  {/* Preview content - enhanced version of what will be in PDF */}
                  <View style={modernStyles.fieldsContainer}>
                    <Text style={modernStyles.sectionHeader}>Clinical Information</Text>
                    {Object.entries(formData).map(([field, value]) => {
                      // Skip metadata fields and already shown patient info
                      if (field.startsWith('_') || 
                          field === 'extractionMethod' || 
                          field === 'extractionDate' ||
                          field === 'patientName' ||
                          field === 'patientDOB' ||
                          !value || 
                          value.trim() === '') {
                        return null;
                      }
                      
                      // Format field label from camelCase
                      const formatLabel = (camelCase) => {
                        const labelMap = {
                          'dx': 'Diagnosis (Dx)',
                          'pcp': 'Primary Care Provider (PCP)',
                          'dc': 'Discharge (DC)',
                          'insurance': 'Insurance Information',
                          'location': 'Location/Facility',
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
                      
                      return (
                        <View key={field} style={modernStyles.fieldPreview}>
                          <Text style={modernStyles.fieldLabel}>
                            {formatLabel(field)}:
                          </Text>
                          <Text style={modernStyles.fieldValue}>{value}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            )}
            
            <TouchableOpacity
              style={[
                modernStyles.downloadButton,
                generatingPdf && modernStyles.disabledButton
              ]}
              onPress={downloadPdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <View style={modernStyles.buttonContent}>
                  <View style={modernStyles.downloadIcon} />
                  <Text style={modernStyles.downloadButtonText}>
                    Download PDF Report
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
};

const modernStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  content: {
    flex: 1,
    padding: Spacing.large,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  previewHeader: {
    marginBottom: Spacing.medium,
  },
  previewTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  previewIcon: {
    width: 4,
    height: 20,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: Spacing.small,
  },
  previewTitle: {
    fontSize: Typography.size.xlarge,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
  },
  previewDescription: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
    marginBottom: Spacing.medium,
  },
  pdfContainer: {
    height: 550,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  pdfFrame: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
    maxHeight: 550,
  },
  previewContent: {
    padding: Spacing.large,
  },
  reportHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.large,
  },
  logoPlaceholder: {
    width: 80,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.medium,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  reportTitleContainer: {
    flex: 1,
  },
  reportTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
    marginBottom: Spacing.medium,
  },
  reportDate: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  // Patient info section
  patientInfoContainer: {
    backgroundColor: '#f0f7fd',
    padding: Spacing.medium,
    borderRadius: BorderRadius.small,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  patientLabel: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
    marginRight: Spacing.small,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.medium,
    color: Colors.black,
  },
  patientDOB: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginTop: 2,
  },
  reviewerInfoContainer: {
    backgroundColor: '#f8fafc',
    padding: Spacing.medium,
    borderRadius: BorderRadius.small,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.large,
  },
  reviewerLabel: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
    marginRight: Spacing.small,
  },
  reviewerName: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    fontWeight: Typography.weight.medium,
    marginRight: Spacing.small,
  },
  reviewerCredentials: {
    fontSize: Typography.size.small,
    color: Colors.primary,
    marginRight: Spacing.small,
  },
  reviewDate: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: Spacing.large,
  },
  fieldsContainer: {
    // Container for fields
  },
  sectionHeader: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
    marginBottom: Spacing.medium,
  },
  fieldPreview: {
    marginBottom: Spacing.medium,
  },
  fieldLabel: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.small,
  },
  fieldValue: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    lineHeight: 22,
    backgroundColor: '#f8fafc',
    padding: Spacing.small,
    borderRadius: BorderRadius.small,
    borderLeftWidth: 2,
    borderLeftColor: '#e2e8f0',
  },
  downloadButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    alignItems: 'center',
    marginTop: Spacing.large,
    ...Shadows.medium,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.white,
    marginRight: Spacing.small,
  },
  downloadButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  disabledButton: {
    backgroundColor: '#cbd5e1',
    ...Shadows.none,
  },
});

export default PDFPreviewScreen;