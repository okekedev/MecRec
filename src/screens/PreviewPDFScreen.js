// src/screens/PDFPreviewScreen.js
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
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import EnhancedHeader from '../components/EnhancedHeader';
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
  
  // Web-specific PDF generation (enhanced version)
  const generateWebPdfPreview = async () => {
    try {
      // Create a new jsPDF instance with professional settings
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });
      
      // Add organization logo (placeholder - replace with your actual logo)
      // For demo, use a colored rectangle as logo placeholder
      doc.setFillColor(41, 128, 185); // Professional blue
      doc.rect(15, 10, 30, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('MedRec', 25, 20);
      
      // Add document title with styling
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(41, 128, 185); // Professional blue
      doc.text('Medical Document Review Report', 15, 40);
      
      // Add clinical document ID and date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100); // Gray for metadata
      doc.text(`Document ID: ${documentId}`, 15, 47);
      doc.text(`Review Date: ${new Date(reviewDate).toLocaleDateString()}`, 15, 52);
      
      // Add separator line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(15, 55, 195, 55);
      
      // Add patient information section when available
      let y = 60;
      if (formData.patientName || formData.patientDOB) {
        doc.setFillColor(240, 240, 240); // Light gray background
        doc.roundedRect(15, y, 180, 15, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text('Patient:', 20, y + 8);
        
        let patientInfo = '';
        if (formData.patientName) {
          patientInfo += formData.patientName;
        }
        if (formData.patientDOB) {
          patientInfo += (patientInfo ? ' | DOB: ' : '') + formData.patientDOB;
        }
        
        doc.setFont('helvetica', 'normal');
        doc.text(patientInfo, 50, y + 8);
        
        y += 20; // Move down for reviewer info
      }
      
      // Add reviewer information in a styled box
      doc.setFillColor(240, 240, 240); // Light gray background
      doc.roundedRect(15, y, 180, 15, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text('Reviewed By:', 20, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(reviewerName, 50, y + 8);
      
      // Format and add each field
      y += 25;
      const addField = (label, value) => {
        if (!value || value.trim() === '') return y;
        
        // Skip patient info fields as they're shown at the top
        if (label === 'Patient Name' || label === 'Date of Birth') return y;
        
        // Set field label styling
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text(`${label}:`, 15, y);
        y += 5;
        
        // Handle line breaks for long values
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        
        const valuePieces = doc.splitTextToSize(value, 180);
        doc.text(valuePieces, 15, y);
        
        y += (valuePieces.length * 5) + 7;
        
        // Add a thin line between sections
        if (y < 250) {
          doc.setDrawColor(220, 220, 220);
          doc.line(15, y - 2, 195, y - 2);
        }
        
        return y;
      };
      
      // Field name to label mapping function
      const formatLabel = (camelCase) => {
        if (camelCase === 'patientName') return 'Patient Name';
        if (camelCase === 'patientDOB') return 'Date of Birth';
        if (camelCase === 'dx') return 'Diagnosis (Dx)';
        if (camelCase === 'pcp') return 'Primary Care Provider (PCP)';
        if (camelCase === 'dc') return 'Discharge (DC)';
        
        return camelCase
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase());
      };
      
      // Group related clinical fields
      // Primary information
      y = addField('Patient Name', formData.patientName);
      y = addField('Date of Birth', formData.patientDOB);
      y = addField('Insurance', formData.insurance);
      y = addField('Location', formData.location);
      y = addField('Diagnosis (Dx)', formData.dx);
      y = addField('Primary Care Provider (PCP)', formData.pcp);
      y = addField('Discharge (DC)', formData.dc);
      
      // Add spacing between groups
      y += 3;
      
      // Clinical details
      y = addField('Wounds', formData.wounds);
      y = addField('Antibiotics', formData.antibiotics);
      y = addField('Cardiac Drips', formData.cardiacDrips);
      y = addField('Labs', formData.labs);
      
      // Check if we need a new page
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      // Assessment details
      y = addField('Face to Face', formData.faceToFace);
      y = addField('History', formData.history);
      y = addField('Mental Health State', formData.mentalHealthState);
      y = addField('Additional Comments', formData.additionalComments);
      
      // Add footer with date and page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated on ${new Date().toLocaleDateString()} by MedRec Clinical Review System`, 15, 285);
        doc.text(`Page ${i} of ${pageCount}`, 180, 285);
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
      
      // Removed navigation to DocumentList
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setGeneratingPdf(false);
      Alert.alert('Error', 'Failed to download PDF');
    }
  };
  
  return (
    <SafeAreaView style={modernStyles.container}>
      <EnhancedHeader
        title="Clinical Report Preview"
        showBackButton={true}
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
                      <Text style={modernStyles.logoText}>MedRec</Text>
                    </View>
                    <View style={modernStyles.reportTitleContainer}>
                      <Text style={modernStyles.reportTitle}>Medical Document Review Report</Text>
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
                    <Text style={modernStyles.reviewDate}>
                      on {new Date(reviewDate).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <View style={modernStyles.divider} />
                  
                  {/* Preview content - enhanced version of what will be in PDF */}
                  <View style={modernStyles.fieldsContainer}>
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
                        if (camelCase === 'dx') return 'Diagnosis (Dx)';
                        if (camelCase === 'pcp') return 'Primary Care Provider (PCP)';
                        if (camelCase === 'dc') return 'Discharge (DC)';
                        
                        return camelCase
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
    width: 60,
    height: 30,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.medium,
  },
  logoText: {
    color: Colors.white,
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.medium,
  },
  reportTitleContainer: {
    flex: 1,
  },
  reportTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
    marginBottom: Spacing.tiny,
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
  fieldPreview: {
    marginBottom: Spacing.large,
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