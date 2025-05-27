// Simplified PDFProcessorService - works with simplified services
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import ParallelPDFTextExtractionService from './ParallelPDFTextExtractionService';
import OllamaService from './OllamaService';
import MedicalFieldService from './MedicalFieldService';

class PDFProcessorService {
  static instance;
  
  constructor() {
    this.documentsCache = new Map();
    this.textExtractionService = ParallelPDFTextExtractionService.getInstance();
    this.ollamaService = OllamaService.getInstance();
    this.medicalFieldService = MedicalFieldService.getInstance();
    this.isProcessing = false;
    this.progressCallback = null;
  }
  
  static getInstance() {
    if (!PDFProcessorService.instance) {
      PDFProcessorService.instance = new PDFProcessorService();
    }
    return PDFProcessorService.instance;
  }
  
  setProgressCallback(callback) {
    this.progressCallback = callback;
    this.textExtractionService.setProgressCallback(callback);
    this.ollamaService.setProgressCallback(callback);
  }
  
  updateProgress(status, progress, step, message) {
    if (this.progressCallback) {
      this.progressCallback({
        status,
        progress,
        currentStep: step,
        message
      });
    }
  }
  
  cancelProcessing() {
    if (this.isProcessing) {
      this.textExtractionService.cancel();
      this.isProcessing = false;
    }
  }
  
  /**
   * Process PDF document - simplified approach
   */
  async processDocument(uri, name) {
    try {
      if (this.isProcessing) {
        throw new Error('Another document is currently being processed');
      }
      
      this.isProcessing = true;
      console.log('Processing document:', name);
      
      this.updateProgress('processing', 0.01, 'Starting', 'Beginning document processing');
      
      // Extract text using OCR
      this.updateProgress('processing', 0.15, 'Text Extraction', 'Starting OCR processing');
      const extractionResult = await this.textExtractionService.extractText(uri);
      
      if (!extractionResult || (extractionResult.error && !extractionResult.text)) {
        this.isProcessing = false;
        const error = extractionResult?.error || 'Unknown error in text extraction';
        this.updateProgress('error', 0.2, 'Extraction Failed', `Error: ${error}`);
        throw new Error(`Text extraction failed: ${error}`);
      }
      
      const id = Date.now().toString();
      const date = new Date().toISOString().split('T')[0];
      const extractedText = extractionResult.text || '';
      
      this.updateProgress('processing', 0.3, 'Text Extracted', `Successfully processed ${extractionResult.pages} pages`);
      
      // Initialize form data using MedicalFieldService
      let formData = this.medicalFieldService.createEmptyFormData();
      
      // Extract information using AI if available
      if (extractedText) {
        try {
          this.updateProgress('processing', 0.35, 'AI Extraction', 'Starting AI information extraction');
          
          const extractedInfo = await this.ollamaService.extractInformation(extractedText);
          
          this.updateProgress('processing', 0.8, 'AI Complete', 'AI extraction completed successfully');
          
          if (extractedInfo && extractedInfo.extractionMethod !== 'failed') {
            console.log('AI extraction successful');
            formData = { ...formData, ...extractedInfo };
            
            if (formData.patientName) {
              this.updateProgress('processing', 0.85, 'Patient Identified', `Found patient: ${formData.patientName}`);
            }
          } else {
            console.error('AI extraction failed:', extractedInfo?.error || 'Unknown error');
            this.updateProgress('warning', 0.8, 'Extraction Issues', 'AI had trouble identifying information');
            formData.extractionMethod = 'failed';
            formData.error = extractedInfo?.error || 'Unknown error';
            
            if (extractedInfo?.rawOutput) {
              formData.rawOutput = extractedInfo.rawOutput;
            }
          }
        } catch (error) {
          console.error('Error in AI extraction:', error);
          this.updateProgress('warning', 0.5, 'AI Unavailable', `Could not connect to AI: ${error.message}`);
          formData.extractionMethod = 'unavailable';
          formData.error = `AI service unavailable: ${error.message}`;
        }
      } else {
        console.error('No text was extracted from the document');
        this.updateProgress('error', 0.4, 'No Text Found', 'No readable text was extracted');
        formData.extractionMethod = 'no_text';
        formData.error = 'No text was extracted from the document';
      }
      
      this.updateProgress('processing', 0.9, 'Processing Complete', 'Document processed successfully');
      
      const processedDocument = {
        id,
        name,
        date,
        uri,
        extractedText,
        isOcr: extractionResult.isOcr || false,
        ocrConfidence: extractionResult.confidence,
        pages: extractionResult.pages || 1,
        formData,
      };
      
      this.documentsCache.set(id, processedDocument);
      
      console.log('Document processed successfully:', id);
      this.updateProgress('complete', 1.0, 'Complete', 'Document processed successfully');
      this.isProcessing = false;
      return processedDocument;
    } catch (error) {
      this.isProcessing = false;
      console.error('Error processing document:', error);
      this.updateProgress('error', 0.5, 'Processing Failed', `Error: ${error.message}`);
      throw error;
    }
  }
  
  // Simple getter methods
  async getProcessedDocuments() {
    return Array.from(this.documentsCache.values());
  }
  
  async getDocumentById(id) {
    return this.documentsCache.get(id) || null;
  }
  
  async deleteDocument(id) {
    if (this.documentsCache.has(id)) {
      const document = this.documentsCache.get(id);
      const uri = document?.uri;
      
      this.documentsCache.delete(id);
      
      // Clean up file if needed
      if (Platform.OS !== 'web' && uri && uri.startsWith(FileSystem.documentDirectory)) {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (e) {
          console.warn('Failed to delete document file:', e);
        }
      } else if (Platform.OS === 'web' && uri && uri.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(uri);
        } catch (e) {
          console.warn('Failed to revoke blob URL:', e);
        }
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Simple placeholder for field reference - no AI reasoning stored
   */
  getFieldReference(documentId, fieldName) {
    const document = this.documentsCache.get(documentId);
    if (document && document.formData) {
      const fieldValue = document.formData[fieldName];
      if (fieldValue) {
        return {
          extractedValue: fieldValue,
          explanation: `AI extracted this information from the document text.`,
          confidence: 'AI Generated',
          timestamp: document.formData.extractionDate
        };
      }
    }
    
    // Return null if no value found - component will handle this
    return null;
  }
}

export default PDFProcessorService;