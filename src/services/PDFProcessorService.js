/**
 * Enhanced PDFProcessorService with reference tracking
 */
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import PDFTextExtractionService from './PDFTextExtractionService';
import MedicalFormExtractor from './MedicalFormExtractor';
import DocumentReferenceService from './DocumentReferenceService';

class PDFProcessorService {
  static instance;
  
  constructor() {
    this.documentsCache = new Map();
    this.textExtractionService = PDFTextExtractionService.getInstance();
    this.formExtractor = MedicalFormExtractor.getInstance();
    this.referenceService = DocumentReferenceService.getInstance();
    this.useAI = true;
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
    this.formExtractor.setUseAI(useAI);
  }
  
  /**
   * Configure Ollama service
   */
  configureOllama(baseUrl, model) {
    // Pass configuration to form extractor
    // (FormExtractor will configure OllamaService)
    this.formExtractor.setUseAI(this.useAI);
  }
  
  /**
   * Process a PDF document and extract text and form data
   * @param uri URI of the PDF document
   * @param name Name of the document
   */
  async processDocument(uri, name) {
    try {
      console.log('Processing document:', name);
      
      // Extract text from the PDF
      const extractionResult = await this.textExtractionService.extractText(uri);
      
      // Generate a unique ID and current date
      const id = Date.now().toString();
      const date = new Date().toISOString().split('T')[0];
      
      // Extract form data using the form extractor service
      const extractedText = extractionResult.text || '';
      const formData = await this.formExtractor.extractFormData(extractedText, id);
      
      // Process document for references
      const references = this.referenceService.processDocument(id, extractedText);
      
      // Generate embeddings (placeholder for now)
      const embeddings = await this.generateEmbeddings(extractedText);
      
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
      
      // Store in cache
      this.documentsCache.set(id, processedDocument);
      
      // Persist to storage
      await this.saveProcessedDocuments();
      
      console.log('Document processed successfully:', id);
      return processedDocument;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }
  
  /**
   * Generate embeddings for the text
   * This is a placeholder - in a real app you would use a proper NLP service
   */
  async generateEmbeddings(text) {
    // Placeholder for embedding generation
    // In a real app, you would call an NLP service or use a local model
    
    // Create a simple random embedding for demonstration
    const embeddingSize = 128;
    const embeddings = Array.from({ length: embeddingSize }, 
      () => Math.random() * 2 - 1);  // Random values between -1 and 1
    
    return embeddings;
  }
  
  /**
   * Get a list of all processed documents
   */
  async getProcessedDocuments() {
    // Load documents if cache is empty
    if (this.documentsCache.size === 0) {
      await this.loadProcessedDocuments();
    }
    
    // Return all documents from cache
    return Array.from(this.documentsCache.values());
  }
  
  /**
   * Get a specific processed document by ID
   */
  async getDocumentById(id) {
    // Check if document is in cache
    if (this.documentsCache.has(id)) {
      return this.documentsCache.get(id);
    }
    
    // Try to load from storage if not in cache
    await this.loadProcessedDocuments();
    
    // Return from cache (or null if not found)
    return this.documentsCache.get(id) || null;
  }
  
  /**
   * Save the processed documents to persistent storage
   */
  async saveProcessedDocuments() {
    try {
      // Prepare documents for serialization
      const documents = Array.from(this.documentsCache.entries()).map(([id, doc]) => {
        // Create a copy that can be serialized
        const serializableDoc = { ...doc };
        
        // Remove circular references or complex objects that can't be serialized
        if (serializableDoc.references && serializableDoc.references.paragraphs) {
          // Simplify paragraphs to avoid circular references
          serializableDoc.references.paragraphs = serializableDoc.references.paragraphs.map(p => ({
            id: p.id,
            type: p.type,
            position: p.position,
            // Limit text length for storage efficiency
            text: p.text.substring(0, 100) + (p.text.length > 100 ? '...' : '')
          }));
        }
        
        return [id, serializableDoc];
      });
      
      // Convert to JSON string
      const documentsData = JSON.stringify(documents);
      
      if (Platform.OS === 'web') {
        // For web, use localStorage
        try {
          localStorage.setItem('processed_documents', documentsData);
          console.log('Documents saved to localStorage');
        } catch (e) {
          console.log('Could not save to localStorage:', e);
        }
      } else {
        // For native platforms, use FileSystem
        const path = `${FileSystem.documentDirectory}processed_documents.json`;
        await FileSystem.writeAsStringAsync(path, documentsData);
        console.log('Documents saved to:', path);
      }
    } catch (error) {
      console.error('Error saving documents:', error);
    }
  }
  
  /**
   * Load the processed documents from persistent storage
   */
  async loadProcessedDocuments() {
    try {
      if (Platform.OS === 'web') {
        // For web, use localStorage
        try {
          const data = localStorage.getItem('processed_documents');
          if (data) {
            const documents = JSON.parse(data);
            this.documentsCache = new Map(documents);
            console.log(`Loaded ${this.documentsCache.size} documents from localStorage`);
          } else {
            console.log('No saved documents found in localStorage');
          }
        } catch (e) {
          console.log('Could not load from localStorage:', e);
        }
      } else {
        // For native platforms, use FileSystem
        const path = `${FileSystem.documentDirectory}processed_documents.json`;
        const exists = await FileSystem.getInfoAsync(path);
        
        if (exists.exists) {
          const data = await FileSystem.readAsStringAsync(path);
          const documents = JSON.parse(data);
          
          this.documentsCache = new Map(documents);
          console.log(`Loaded ${this.documentsCache.size} documents from storage`);
        } else {
          console.log('No saved documents found');
        }
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }
  
  /**
   * Delete a document from storage
   */
  async deleteDocument(id) {
    if (this.documentsCache.has(id)) {
      // Get document URI before deleting
      const document = this.documentsCache.get(id);
      const uri = document?.uri;
      
      // Remove from cache
      this.documentsCache.delete(id);
      
      // Try to delete file if it's in the app's directory
      if (uri && uri.startsWith(FileSystem.documentDirectory)) {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          console.log('Deleted document file:', uri);
        } catch (e) {
          console.warn('Failed to delete document file:', e);
        }
      }
      
      // Update storage
      await this.saveProcessedDocuments();
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Get document references
   */
  getDocumentReferences(documentId) {
    return this.referenceService.getDocumentReferences(documentId);
  }
  
  /**
   * Get reference for a specific field in a document
   */
  getFieldReference(documentId, fieldName) {
    const document = this.documentsCache.get(documentId);
    if (document && document.formData) {
      return this.formExtractor.getFieldReference(document.formData, fieldName);
    }
    return null;
  }
  
  /**
   * Highlight references in document text
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