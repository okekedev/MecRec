import * as FileSystem from 'expo-file-system';
import PDFTextExtractionService from './PDFTextExtractionService';
import MedicalFormExtractor from './MedicalFormExtractor';

class PDFProcessorService {
  static instance;
  
  constructor() {
    this.documentsCache = new Map();
    this.textExtractionService = PDFTextExtractionService.getInstance();
    this.formExtractor = MedicalFormExtractor.getInstance();
  }
  
  static getInstance() {
    if (!PDFProcessorService.instance) {
      PDFProcessorService.instance = new PDFProcessorService();
    }
    return PDFProcessorService.instance;
  }
  
  /**
   * Process a PDF document and extract text and form data
   * @param uri URI of the PDF document
   * @param name Name of the document
   */
  async processDocument(uri, name) {
    try {
      // Extract text from the PDF
      const extractionResult = await this.textExtractionService.extractText(uri);
      
      // Generate a unique ID and current date
      const id = Date.now().toString();
      const date = new Date().toISOString().split('T')[0];
      
      // Extract form data using the form extractor service
      const extractedText = extractionResult.text || '';
      const formData = this.formExtractor.extractFormData(extractedText);
      
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
        embeddings,
      };
      
      // Store in cache
      this.documentsCache.set(id, processedDocument);
      
      // Persist to storage
      await this.saveProcessedDocuments();
      
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
    // In a real app, we would load this from persistent storage
    // For now, just return from our in-memory cache
    return Array.from(this.documentsCache.values());
  }
  
  /**
   * Get a specific processed document by ID
   */
  async getDocumentById(id) {
    return this.documentsCache.get(id);
  }
  
  /**
   * Save the processed documents to persistent storage
   * This is a placeholder for actual implementation
   */
  async saveProcessedDocuments() {
    try {
      // In a real app, this would save to AsyncStorage or a similar persistence mechanism
      const documentsData = JSON.stringify(Array.from(this.documentsCache.entries()));
      const path = `${FileSystem.documentDirectory}processed_documents.json`;
      
      await FileSystem.writeAsStringAsync(path, documentsData);
      console.log('Documents saved to:', path);
    } catch (error) {
      console.error('Error saving documents:', error);
    }
  }
  
  /**
   * Load the processed documents from persistent storage
   */
  async loadProcessedDocuments() {
    try {
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
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }
}

export default PDFProcessorService;