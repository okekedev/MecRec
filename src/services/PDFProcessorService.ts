import RNFS from 'react-native-fs';
import PDFTextExtractionService from './PDFTextExtractionService';
import MedicalFormExtractor from './MedicalFormExtractor';

export interface ProcessedDocument {
  id: string;
  name: string;
  date: string;
  uri: string;
  extractedText: string;
  isOcr: boolean;
  ocrConfidence?: number;
  pages: number;
  formData?: Record<string, any>;
  embeddings?: number[];
}

class PDFProcessorService {
  private static instance: PDFProcessorService;
  private documentsCache: Map<string, ProcessedDocument> = new Map();
  private textExtractionService: PDFTextExtractionService;
  private formExtractor: MedicalFormExtractor;
  
  private constructor() {
    this.textExtractionService = PDFTextExtractionService.getInstance();
    this.formExtractor = MedicalFormExtractor.getInstance();
  }
  
  public static getInstance(): PDFProcessorService {
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
  public async processDocument(uri: string, name: string): Promise<ProcessedDocument> {
    try {
      // Extract text from the PDF
      const extractionResult = await this.textExtractionService.extractText(uri);
      
      // Generate a unique ID and current date
      const id = Date.now().toString();
      const date = new Date().toISOString().split('T')[0];
      
      // Extract form data using the form extractor service
      const formData = this.formExtractor.extractFormData(extractionResult.text);
      
      // Generate embeddings (placeholder for now)
      const embeddings = await this.generateEmbeddings(extractionResult.text);
      
      // Create the processed document
      const processedDocument: ProcessedDocument = {
        id,
        name,
        date,
        uri,
        extractedText: extractionResult.text,
        isOcr: extractionResult.isOcr,
        ocrConfidence: extractionResult.confidence,
        pages: extractionResult.pages,
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
  private async generateEmbeddings(text: string): Promise<number[]> {
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
  public async getProcessedDocuments(): Promise<ProcessedDocument[]> {
    // In a real app, we would load this from persistent storage
    // For now, just return from our in-memory cache
    return Array.from(this.documentsCache.values());
  }
  
  /**
   * Get a specific processed document by ID
   */
  public async getDocumentById(id: string): Promise<ProcessedDocument | undefined> {
    return this.documentsCache.get(id);
  }
  
  /**
   * Save the processed documents to persistent storage
   * This is a placeholder for actual implementation
   */
  private async saveProcessedDocuments(): Promise<void> {
    try {
      // In a real app, this would save to AsyncStorage or a similar persistence mechanism
      const documentsData = JSON.stringify(Array.from(this.documentsCache.entries()));
      const path = `${RNFS.DocumentDirectoryPath}/processed_documents.json`;
      
      await RNFS.writeFile(path, documentsData, 'utf8');
      console.log('Documents saved to:', path);
    } catch (error) {
      console.error('Error saving documents:', error);
    }
  }
  
  /**
   * Load the processed documents from persistent storage
   */
  public async loadProcessedDocuments(): Promise<void> {
    try {
      const path = `${RNFS.DocumentDirectoryPath}/processed_documents.json`;
      const exists = await RNFS.exists(path);
      
      if (exists) {
        const data = await RNFS.readFile(path, 'utf8');
        const documents = JSON.parse(data) as [string, ProcessedDocument][];
        
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