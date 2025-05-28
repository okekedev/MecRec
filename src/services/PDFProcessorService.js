// src/services/PDFProcessorService.js - Use positions from enhanced OCR service
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
    
    // Store text positions for highlighting
    this.textPositions = new Map();
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
  
  /**
   * SIMPLIFIED: Main processing using OCR positions from extraction service
   */
  async processDocument(uri, name) {
    try {
      if (this.isProcessing) {
        throw new Error('Another document is currently being processed');
      }
      
      this.isProcessing = true;
      console.log('Processing document:', name);
      
      this.updateProgress('processing', 0.01, 'Starting', 'Beginning document processing');
      
      const id = Date.now().toString();
      const date = new Date().toISOString().split('T')[0];
      
      // STEP 1: Extract text AND positions in single OCR run
      this.updateProgress('processing', 0.15, 'Text Extraction', 'Starting OCR processing with position capture');
      const extractionResult = await this.textExtractionService.extractText(uri);
      
      if (!extractionResult || (extractionResult.error && !extractionResult.text)) {
        this.isProcessing = false;
        const error = extractionResult?.error || 'Unknown error in text extraction';
        this.updateProgress('error', 0.2, 'Extraction Failed', `Error: ${error}`);
        throw new Error(`Text extraction failed: ${error}`);
      }
      
      const extractedText = extractionResult.text || '';
      
      this.updateProgress('processing', 0.3, 'Text Extracted', `Successfully processed ${extractionResult.pages} pages`);
      
      // STEP 2: Get positions from OCR service
      this.updateProgress('processing', 0.32, 'Position Mapping', 'Retrieving text positions from OCR results');
      
      console.log('DEBUG: Getting positions from OCR extraction service...');
      const positions = this.textExtractionService.getLastExtractedPositions();
      console.log(`DEBUG: Retrieved ${positions.length} positions from OCR service`);
      
      // Store positions for highlighting
      this.textPositions.set(id, positions);
      
      if (positions.length > 0) {
        this.updateProgress('processing', 0.38, 'Position Mapping Complete', 
          `Retrieved ${positions.length} text positions from OCR`);
        
        // Show sample positions
        console.log('DEBUG: Sample OCR positions retrieved:');
        positions.slice(0, 5).forEach((pos, i) => {
          console.log(`  ${i + 1}. "${pos.text}" at (${Math.round(pos.x)}, ${Math.round(pos.y)}) [${pos.source}]`);
        });
      } else {
        this.updateProgress('processing', 0.38, 'Position Mapping', 'No text positions found - highlighting disabled');
        console.log('DEBUG: ⚠️ No positions retrieved from OCR service');
      }
      
      // STEP 3: AI processing (existing code)
      let formData = this.medicalFieldService.createEmptyFormData();
      
      if (extractedText) {
        try {
          this.updateProgress('processing', 0.4, 'AI Extraction', 'Starting AI information extraction');
          
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
        hasHighlighting: positions.length > 0,
        positionSource: positions.length > 0 ? positions[0].source : 'none'
      };
      
      this.documentsCache.set(id, processedDocument);
      
      console.log(`Document processed successfully: ${id} (${positions.length} positions for highlighting using ${processedDocument.positionSource})`);
      this.updateProgress('complete', 1.0, 'Complete', 'Document processed with source highlighting');
      this.isProcessing = false;
      return processedDocument;
    } catch (error) {
      this.isProcessing = false;
      console.error('Error processing document:', error);
      this.updateProgress('error', 0.5, 'Processing Failed', `Error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Find source positions for extracted field values
   */
  findSourcePositions(documentId, fieldValue) {
    console.log(`DEBUG: 🔍 Looking for positions for: "${fieldValue}"`);
    
    if (!fieldValue || !fieldValue.trim()) {
      console.log('DEBUG: No field value provided');
      return [];
    }
    
    const positions = this.textPositions.get(documentId) || [];
    console.log(`DEBUG: Have ${positions.length} total positions to search in document ${documentId}`);
    
    if (positions.length === 0) {
      console.log('DEBUG: ❌ No positions stored for this document');
      return [];
    }
    
    // Show what type of positions we're using
    const positionSource = positions.length > 0 ? positions[0].source : 'unknown';
    console.log(`DEBUG: Using ${positionSource} positions for highlighting`);
    
    const searchText = fieldValue.toLowerCase().trim();
    const matches = [];
    
    // STRATEGY 1: Exact substring matching
    console.log(`DEBUG: Strategy 1 - Looking for exact matches of: "${searchText}"`);
    positions.forEach((pos, index) => {
      const posText = pos.text.toLowerCase();
      
      if (posText.includes(searchText)) {
        matches.push({
          ...pos,
          matchType: 'exact',
          matchText: fieldValue
        });
        console.log(`DEBUG: ✅ Exact match - "${pos.text}" contains "${fieldValue}" [${pos.source}]`);
      }
    });
    
    // STRATEGY 2: Word-by-word matching for complex phrases
    if (matches.length === 0 && searchText.includes(' ')) {
      console.log('DEBUG: Strategy 2 - Word-by-word matching');
      
      const words = searchText.split(' ').filter(word => word.length > 2);
      console.log(`DEBUG: Searching for words: [${words.join(', ')}]`);
      
      words.forEach(word => {
        let wordMatches = 0;
        positions.forEach((pos, index) => {
          const posText = pos.text.toLowerCase();
          
          if (posText.includes(word)) {
            // Avoid duplicates
            if (!matches.find(m => m.index === pos.index && m.page === pos.page)) {
              matches.push({
                ...pos,
                matchType: 'partial',
                matchText: fieldValue,
                matchedWord: word
              });
              wordMatches++;
              console.log(`DEBUG: ✅ Word match - "${pos.text}" contains "${word}" [${pos.source}]`);
            }
          }
        });
        console.log(`DEBUG: Found ${wordMatches} matches for word "${word}"`);
      });
    }
    
    // STRATEGY 3: Partial matching for short terms
    if (matches.length === 0 && searchText.length >= 4) {
      console.log('DEBUG: Strategy 3 - Partial matching');
      
      positions.forEach((pos, index) => {
        const posText = pos.text.toLowerCase();
        
        // Try partial matching
        const partialLength = Math.min(6, searchText.length);
        const partialText = searchText.substring(0, partialLength);
        
        if (posText.includes(partialText)) {
          matches.push({
            ...pos,
            matchType: 'fuzzy',
            matchText: fieldValue,
            matchedPart: partialText
          });
          console.log(`DEBUG: ✅ Partial match - "${pos.text}" contains "${partialText}" [${pos.source}]`);
        }
      });
    }
    
    console.log(`DEBUG: 🎯 Final result: Found ${matches.length} total matches for "${fieldValue}"`);
    
    if (matches.length > 0) {
      console.log('DEBUG: Match summary:');
      matches.forEach((match, i) => {
        console.log(`  ${i + 1}. "${match.text}" (${match.matchType}) Page ${match.page} at (${Math.round(match.x)}, ${Math.round(match.y)})`);
      });
    }
    
    // Sort by match quality and page order
    matches.sort((a, b) => {
      // Prefer exact matches
      if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
      if (b.matchType === 'exact' && a.matchType !== 'exact') return 1;
      
      // Then sort by page
      if (a.page !== b.page) return a.page - b.page;
      
      // Then by position on page
      return a.y - b.y;
    });
    
    return matches.slice(0, 5); // Return top 5 matches
  }
  
  /**
   * Get field reference with source positions
   */
  getFieldReference(documentId, fieldKey) {
    const document = this.documentsCache.get(documentId);
    if (!document || !document.formData) {
      return null;
    }
    
    const fieldValue = document.formData[fieldKey];
    if (!fieldValue) {
      return null;
    }
    
    // Find source positions
    const sourcePositions = this.findSourcePositions(documentId, fieldValue);
    
    return {
      extractedValue: fieldValue,
      explanation: `AI extracted this information from the document text.`,
      confidence: 'AI Generated',
      timestamp: document.formData.extractionDate,
      sourcePositions: sourcePositions,
      hasSourceHighlighting: sourcePositions.length > 0
    };
  }
  
  // Keep all existing methods unchanged
  cancelProcessing() {
    if (this.isProcessing) {
      this.textExtractionService.cancel();
      this.isProcessing = false;
    }
  }
  
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
      
      this.textPositions.delete(id);
      this.documentsCache.delete(id);
      
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
}

export default PDFProcessorService;