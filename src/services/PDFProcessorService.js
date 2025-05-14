/**
 * PDFProcessorService with parallel OCR processing
 */
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import ParallelPDFTextExtractionService from './ParallelPDFTextExtractionService';
import DocumentReferenceService from './DocumentReferenceService';
import OllamaService from './OllamaService';

class PDFProcessorService {
  static instance;
  
  constructor() {
    // Use in-memory cache only - no persistence
    this.documentsCache = new Map();
    
    // Use the parallel text extraction service for improved performance
    this.textExtractionService = ParallelPDFTextExtractionService.getInstance();
    
    // Remove reference to MedicalFormExtractor
    this.referenceService = DocumentReferenceService.getInstance();
    this.ollamaService = OllamaService.getInstance();
    this.useAI = true;
    this.isProcessing = false;
  }
  
  static getInstance() {
    if (!PDFProcessorService.instance) {
      PDFProcessorService.instance = new PDFProcessorService();
    }
    return PDFProcessorService.instance;
  }
  
  /**
   * Set whether to use AI for processing
   */
  setUseAI(useAI) {
    this.useAI = useAI;
    // Remove reference to formExtractor
  }
  
  /**
   * Configure Ollama service
   */
  configureOllama(baseUrl, model) {
    this.ollamaService.setBaseUrl(baseUrl);
    this.ollamaService.setDefaultModel(model);
    // Remove reference to formExtractor
  }
  
  /**
   * Cancel current processing if any
   */
  cancelProcessing() {
    if (this.isProcessing) {
      this.textExtractionService.cancel();
      this.isProcessing = false;
      console.log('PDF processing canceled');
    }
  }
  
  /**
   * Process a PDF document and extract text and form data
   * @param {string} uri - URI of the PDF document
   * @param {string} name - Name of the document
   * @returns {Promise<Object>} Processed document
   */
  async processDocument(uri, name) {
    try {
      if (this.isProcessing) {
        throw new Error('Another document is currently being processed');
      }
      
      this.isProcessing = true;
      console.log('Processing document:', name);
      
      // Extract text from the PDF using parallel OCR
      const extractionResult = await this.textExtractionService.extractText(uri);
      
      // If processing was canceled or failed
      if (!extractionResult || (extractionResult.error && !extractionResult.text)) {
        this.isProcessing = false;
        
        if (extractionResult && extractionResult.error) {
          throw new Error(`Text extraction failed: ${extractionResult.error}`);
        } else {
          throw new Error('Text extraction failed: Unknown error');
        }
      }
      
      // Generate a unique ID and current date
      const id = Date.now().toString();
      const date = new Date().toISOString().split('T')[0];
      
      // Extract form data - simplified since MedicalFormExtractor is not available
      const extractedText = extractionResult.text || '';
      
      // Create a simple formData object with empty placeholders
      const formData = {
        extractionMethod: 'basic',
        extractionDate: new Date().toISOString(),
        insurance: '',
        location: '',
        dx: '',
        pcp: '',
        dc: '',
        wounds: '',
        antibiotics: '',
        cardiacDrips: '',
        labs: '',
        faceToFace: '',
        history: '',
        mentalHealthState: '',
        additionalComments: ''
      };
      
      // Process document for references
      const references = this.referenceService.processDocument(id, extractedText);
      
      // Generate embeddings using our embedding service if AI is enabled
      let embeddings = [];
      if (this.useAI) {
        embeddings = await this.generateEmbeddings(extractedText);
      }
      
      // Create the processed document
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
        references: references,
        embeddings,
      };
      
      // Store in cache only - no persistence
      this.documentsCache.set(id, processedDocument);
      
      console.log('Document processed successfully:', id);
      this.isProcessing = false;
      return processedDocument;
    } catch (error) {
      this.isProcessing = false;
      console.error('Error processing document:', error);
      throw error;
    } finally {
      // Clean up resources
      this.isProcessing = false;
    }
  }
  
  /**
   * Generate embeddings for the text using Ollama service
   * @param {string} text - Text to generate embeddings for
   * @returns {Promise<Array>} Embeddings
   */
  async generateEmbeddings(text) {
    try {
      // Check if Ollama is available and AI is enabled
      if (this.useAI) {
        try {
          const connectionTest = await this.ollamaService.testConnection();
          
          if (connectionTest) {
            // Use Ollama to generate embeddings
            console.log('Generating embeddings using Ollama service');
            
            // For very long texts, truncate to avoid issues
            const truncatedText = text.length > 10000 ? 
              text.substring(0, 10000) + '...' : text;
              
            const embeddings = await this.ollamaService.generateEmbeddings(truncatedText);
            return embeddings;
          }
        } catch (error) {
          console.warn('Ollama embedding generation failed:', error);
          // Fall back to random embeddings
        }
      }
      
      // Fallback to random embeddings
      console.log('Using fallback random embeddings');
      return this.generateRandomEmbeddings();
    } catch (error) {
      console.error('Error generating embeddings:', error);
      return this.generateRandomEmbeddings();
    }
  }
  
  /**
   * Generate random embeddings as a fallback
   * @param {number} dimensions - Number of dimensions
   * @returns {Array} Random embeddings
   */
  generateRandomEmbeddings(dimensions = 128) {
    return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
  }
  
  /**
   * Get a list of all processed documents
   * @returns {Promise<Array>} List of documents
   */
  async getProcessedDocuments() {
    // Return all documents from cache
    return Array.from(this.documentsCache.values());
  }
  
  /**
   * Get a specific processed document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Document or null
   */
  async getDocumentById(id) {
    // Check if document is in cache
    if (this.documentsCache.has(id)) {
      return this.documentsCache.get(id);
    }
    
    // Document not found
    return null;
  }
  
  /**
   * Delete a document from memory
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} Whether deletion was successful
   */
  async deleteDocument(id) {
    if (this.documentsCache.has(id)) {
      // Get document URI before deleting
      const document = this.documentsCache.get(id);
      const uri = document?.uri;
      
      // Remove from cache
      this.documentsCache.delete(id);
      
      // Try to delete file if it's in the app's directory and we're not on web
      if (Platform.OS !== 'web' && uri && uri.startsWith(FileSystem.documentDirectory)) {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          console.log('Deleted document file:', uri);
        } catch (e) {
          console.warn('Failed to delete document file:', e);
        }
      } else if (Platform.OS === 'web' && uri && uri.startsWith('blob:')) {
        // For web, revoke the blob URL
        try {
          URL.revokeObjectURL(uri);
          console.log('Revoked blob URL:', uri);
        } catch (e) {
          console.warn('Failed to revoke blob URL:', e);
        }
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Get document references
   * @param {string} documentId - Document ID
   * @returns {Object|null} References
   */
  getDocumentReferences(documentId) {
    return this.referenceService.getDocumentReferences(documentId);
  }
  
  /**
   * Get reference for a specific field in a document
   * @param {string} documentId - Document ID
   * @param {string} fieldName - Field name
   * @returns {Object|null} Field reference
   */
  getFieldReference(documentId, fieldName) {
    const document = this.documentsCache.get(documentId);
    if (document && document.formData) {
      // Simplified reference retrieval since formExtractor is not available
      return null;
    }
    return null;
  }
  
  /**
   * Highlight references in document text
   * @param {string} documentId - Document ID
   * @param {Array} references - References to highlight
   * @returns {string|null} Highlighted text
   */
  getHighlightedText(documentId, references) {
    const document = this.documentsCache.get(documentId);
    if (document && document.extractedText) {
      return this.referenceService.highlightReferences(
        document.extractedText,
        references
      );
    }
    return null;
  }
}

export default PDFProcessorService;