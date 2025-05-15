// PDFProcessorService with numbered list extraction instead of JSON
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
    
    this.referenceService = DocumentReferenceService.getInstance();
    this.ollamaService = OllamaService.getInstance();
    this.useAI = true;
    this.isProcessing = false;
    this.progressCallback = null;
  }
  
  static getInstance() {
    if (!PDFProcessorService.instance) {
      PDFProcessorService.instance = new PDFProcessorService();
    }
    return PDFProcessorService.instance;
  }
  
  /**
   * Set progress callback to track processing
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
    // Pass the callback to text extraction service too
    this.textExtractionService.setProgressCallback(callback);
    // Pass the callback to ollama service too
    this.ollamaService.setProgressCallback(callback);
  }
  
  /**
   * Update progress status
   */
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
   * Set whether to use AI for processing
   */
  setUseAI(useAI) {
    this.useAI = useAI;
  }
  
  /**
   * Configure Ollama service
   */
  configureOllama(baseUrl, model) {
    this.ollamaService.setBaseUrl(baseUrl);
    this.ollamaService.setDefaultModel(model);
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
   * Updated for numbered list approach instead of JSON
   * 
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
      
      // Update progress
      this.updateProgress('processing', 0.01, 'Starting', 'Beginning document processing');
      
      // Check if Ollama is available before starting
      try {
        this.updateProgress('processing', 0.05, 'Checking AI', 'Verifying AI model availability');
        
        const isConnected = await this.ollamaService.testConnection();
        if (!isConnected) {
          this.updateProgress('warning', 0.1, 'AI Unavailable', 'Ollama server not detected - extraction may be limited');
          console.warn('Ollama server not available');
        } else {
          // Check if model is available and initialize if needed
          await this.ollamaService.initialize();
          console.log(`Using Ollama model: ${this.ollamaService.defaultModel}`);
          this.updateProgress('processing', 0.1, 'AI Ready', `Using model: ${this.ollamaService.defaultModel}`);
        }
      } catch (ollamaError) {
        console.warn('Ollama check failed:', ollamaError);
        this.updateProgress('warning', 0.1, 'AI Check Failed', `Cannot connect to AI: ${ollamaError.message}`);
        // Continue processing - we'll handle this later
      }
      
      // Extract text from the PDF using parallel OCR
      this.updateProgress('processing', 0.15, 'Text Extraction', 'Starting OCR processing');
      const extractionResult = await this.textExtractionService.extractText(uri);
      
      // If processing was canceled or failed
      if (!extractionResult || (extractionResult.error && !extractionResult.text)) {
        this.isProcessing = false;
        
        if (extractionResult && extractionResult.error) {
          this.updateProgress('error', 0.2, 'Extraction Failed', `Error: ${extractionResult.error}`);
          throw new Error(`Text extraction failed: ${extractionResult.error}`);
        } else {
          this.updateProgress('error', 0.2, 'Extraction Failed', 'Unknown error in text extraction');
          throw new Error('Text extraction failed: Unknown error');
        }
      }
      
      // Generate a unique ID and current date
      const id = Date.now().toString();
      const date = new Date().toISOString().split('T')[0];
      
      // Extract the text from the extraction result
      const extractedText = extractionResult.text || '';
      
      this.updateProgress('processing', 0.3, 'Text Extracted', `Successfully processed ${extractionResult.pages} pages`);
      
      // Initialize default formData structure
      let formData = {
        extractionMethod: 'numbered-list',
        extractionDate: new Date().toISOString(),
        patientName: '',
        patientDOB: '',
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
      
      // Check if there's text to extract from
      if (extractedText) {
        try {
          console.log(`Using AI to extract information from ${extractedText.length} characters of text (${extractionResult.pages} pages)`);
          this.updateProgress('processing', 0.35, 'AI Extraction', 'Starting AI information extraction');
          
          // Get the model being used
          const ollamaModel = this.ollamaService.defaultModel;
          console.log(`Using Ollama with model: ${ollamaModel}`);
          
          // Check Ollama connection
          const testConnection = await this.ollamaService.testConnection();
          
          if (testConnection) {
            // Extract information using Ollama with the numbered list approach
            const extractedInfo = await this.ollamaService.extractInformation(extractedText);
            
            this.updateProgress('processing', 0.8, 'AI Complete', 'AI extraction completed successfully');
            
            if (extractedInfo && extractedInfo.extractionMethod !== 'failed') {
              console.log('Ollama extraction successful');
              console.log('Extracted fields:', Object.keys(extractedInfo).filter(k => 
                !k.startsWith('_') && k !== 'extractionMethod' && k !== 'extractionDate'
              ));
              
              // Merge the AI-extracted information with our default formData
              formData = { ...formData, ...extractedInfo };
              
              // Show important patient info in progress
              if (formData.patientName) {
                this.updateProgress('processing', 0.85, 'Patient Identified', `Found patient: ${formData.patientName}`);
              }
            } else {
              console.error('Ollama extraction failed:', extractedInfo?.error || 'Unknown error');
              this.updateProgress('warning', 0.8, 'Extraction Issues', 'AI had trouble identifying some information');
              formData.extractionMethod = 'failed';
              formData.error = extractedInfo?.error || 'Unknown error';
              
              // Include raw output for debugging if available
              if (extractedInfo?.rawOutput) {
                formData.rawOutput = extractedInfo.rawOutput;
              }
            }
          } else {
            console.error('Ollama service not available');
            this.updateProgress('warning', 0.5, 'AI Unavailable', 'Could not connect to Ollama service');
            formData.extractionMethod = 'unavailable';
            formData.error = 'Ollama service is not available';
          }
        } catch (error) {
          console.error('Error in Ollama extraction:', error);
          this.updateProgress('error', 0.5, 'AI Error', `Extraction error: ${error.message}`);
          formData.extractionMethod = 'error';
          formData.error = error.message;
        }
      } else {
        console.error('No text was extracted from the document');
        this.updateProgress('error', 0.4, 'No Text Found', 'No readable text was extracted from the document');
        formData.extractionMethod = 'no_text';
        formData.error = 'No text was extracted from the document';
      }
      
      // Process document for references
      this.updateProgress('processing', 0.9, 'Creating References', 'Processing document sections');
      const references = this.referenceService.processDocument(id, extractedText);
      
      // Generate embeddings for all paragraphs at once to improve field reference matching
      const paragraphEmbeddings = [];
      try {
        if (this.useAI) {
          const testConnection = await this.ollamaService.testConnection();
          if (testConnection) {
            this.updateProgress('processing', 0.93, 'Generating Embeddings', 'Creating semantic document index');
            
            // Generate embeddings for each paragraph to prepare for field matching
            if (references && references.paragraphs) {
              for (const paragraph of references.paragraphs) {
                try {
                  const embedding = await this.ollamaService.generateEmbeddings(paragraph.text);
                  paragraphEmbeddings.push({
                    paragraph,
                    embedding
                  });
                } catch (embErr) {
                  console.warn('Error generating paragraph embedding:', embErr);
                }
              }
              console.log(`Generated embeddings for ${paragraphEmbeddings.length} paragraphs`);
            }
            
            // Ensure field references exist
            if (!formData._references) {
              formData._references = {};
            }
            
            // For each extracted field, find its source in the document
            await this.createFieldReferencesWithEmbeddings(formData, extractedText, references, paragraphEmbeddings);
          }
        }
      } catch (embeddingError) {
        console.warn('Error generating embeddings:', embeddingError);
        // Continue without embeddings
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
        paragraphEmbeddings,
      };
      
      // Add logging to debug field structure
      console.log('Form data field names:', Object.keys(formData).filter(k => !k.startsWith('_')));
      
      // Store in cache only - no persistence
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
    } finally {
      // Clean up resources
      this.isProcessing = false;
    }
  }
  
  /**
   * Create field references using pre-generated paragraph embeddings
   * This is a more efficient approach that works with the numbered list format
   * @param {Object} formData - Extracted form data
   * @param {string} text - Full document text
   * @param {Object} references - Document references
   * @param {Array} paragraphEmbeddings - Pre-generated paragraph embeddings
   */
  async createFieldReferencesWithEmbeddings(formData, text, references, paragraphEmbeddings) {
    // Skip if no references or paragraph embeddings
    if (!references || !references.paragraphs || !paragraphEmbeddings || paragraphEmbeddings.length === 0) {
      return;
    }
    
    // Ensure _references exists
    if (!formData._references) {
      formData._references = {};
    }
    
    console.log("Creating field references for all fields using pre-generated embeddings");
    
    // For each field with content, try to find its source
    for (const [field, value] of Object.entries(formData)) {
      // Skip metadata fields or empty values
      if (field.startsWith('_') || 
          field === 'extractionMethod' || 
          field === 'extractionDate' || 
          field === 'error' ||
          !value || 
          value.trim() === '') {
        continue;
      }
      
      try {
        // First try exact text matching (fastest)
        let foundRef = false;
        
        // For each paragraph, check if it contains the exact field value
        for (const paragraphEmb of paragraphEmbeddings) {
          const paragraph = paragraphEmb.paragraph;
          if (paragraph.text.includes(value)) {
            formData._references[field] = {
              text: paragraph.text,
              location: paragraph.type,
              matchType: 'exact'
            };
            foundRef = true;
            break;
          }
        }
        
        // If no exact match, try semantic search using paragraph embeddings
        if (!foundRef && value.length > 3) {
          // Generate embedding for the field value
          const fieldEmbedding = await this.ollamaService.generateEmbeddings(value);
          
          // Calculate similarity with each paragraph embedding
          const scoredParagraphs = paragraphEmbeddings.map(pe => ({
            paragraph: pe.paragraph,
            score: this.ollamaService.cosineSimilarity(fieldEmbedding, pe.embedding)
          }));
          
          // Sort by similarity score
          scoredParagraphs.sort((a, b) => b.score - a.score);
          
          // Use top result if score is good enough
          if (scoredParagraphs.length > 0 && scoredParagraphs[0].score > 0.4) {
            const topMatch = scoredParagraphs[0];
            formData._references[field] = {
              text: topMatch.paragraph.text,
              location: topMatch.paragraph.type,
              matchType: 'semantic',
              score: topMatch.score
            };
            foundRef = true;
          }
        }
        
        // If still no match, try keyword matching
        if (!foundRef) {
          // Extract keywords from the field value
          const keywords = value.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3 && !['with', 'this', 'that', 'from', 'have', 'were', 'because', 'about'].includes(word));
          
          // Score paragraphs by keyword matches
          const keywordMatches = [];
          
          for (const paragraphEmb of paragraphEmbeddings) {
            const paragraph = paragraphEmb.paragraph;
            const paragraphText = paragraph.text.toLowerCase();
            let matchCount = 0;
            
            // Count matching keywords
            for (const keyword of keywords) {
              if (paragraphText.includes(keyword)) {
                matchCount++;
              }
            }
            
            if (matchCount > 0) {
              keywordMatches.push({
                paragraph,
                matchCount,
                score: matchCount / keywords.length
              });
            }
          }
          
          // Sort by match count
          keywordMatches.sort((a, b) => b.matchCount - a.matchCount);
          
          // Use top result if any matches found
          if (keywordMatches.length > 0) {
            const topKeywordMatch = keywordMatches[0];
            formData._references[field] = {
              text: topKeywordMatch.paragraph.text,
              location: topKeywordMatch.paragraph.type,
              matchType: 'keyword',
              matchCount: topKeywordMatch.matchCount,
              score: topKeywordMatch.score
            };
          }
        }
      } catch (error) {
        console.warn(`Error finding reference for field ${field}:`, error);
      }
    }
    
    console.log(`Created references for ${Object.keys(formData._references).length} fields using embeddings`);
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
      // Look for reference information
      if (document.formData._references && document.formData._references[fieldName]) {
        return document.formData._references[fieldName];
      }
      
      // Fall back to looking in document references
      const references = this.referenceService.getDocumentReferences(documentId);
      if (references && references.paragraphs) {
        // Try to find a paragraph that might contain this field
        const fieldValue = document.formData[fieldName];
        if (fieldValue && typeof fieldValue === 'string') {
          // Look for paragraphs containing the field value
          const matchingParagraph = references.paragraphs.find(p => 
            p.text.toLowerCase().includes(fieldValue.toLowerCase())
          );
          
          if (matchingParagraph) {
            return {
              text: matchingParagraph.text,
              location: matchingParagraph.type
            };
          }
        }
      }
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