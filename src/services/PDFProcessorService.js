/**
 * PDFProcessorService.js - Enhanced service for processing PDF documents
 * Coordinates between ParallelPDFTextExtractionService, OllamaService, and EmbeddingService
 */
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import ParallelPDFTextExtractionService from './ParallelPDFTextExtractionService';
import DocumentReferenceService from './DocumentReferenceService';
import OllamaService from './OllamaService';
import EmbeddingService from './EmbeddingService';
import SectionType, { getRelatedSectionTypesForField } from '../constants/SectionTypes';

class PDFProcessorService {
  static instance;
  
  constructor() {
    // Use in-memory cache only - no persistence
    this.documentsCache = new Map();
    
    // Use the parallel text extraction service for improved performance
    this.textExtractionService = ParallelPDFTextExtractionService.getInstance();
    
    // Initialize services
    this.referenceService = DocumentReferenceService.getInstance();
    this.ollamaService = OllamaService.getInstance();
    this.embeddingService = EmbeddingService.getInstance();
    
    // NEW: Add tracking for important document sections
    this.importantSections = new Map(); // documentId -> Map of fieldName -> sections
    
    // NEW: Add shared context flag
    this.enableSharedContext = true; // Toggle for the new functionality
    
    // Configuration
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
   * @param {Function} callback - Progress callback function
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
   * @param {string} status - Progress status
   * @param {number} progress - Progress value (0-1)
   * @param {string} step - Current processing step
   * @param {string} message - Progress message
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
   * @param {boolean} useAI - Whether to use AI
   */
  setUseAI(useAI) {
    this.useAI = useAI;
  }
  
  /**
   * NEW: Enable or disable shared context between services
   * @param {boolean} enable - Whether to enable shared context
   */
  setSharedContext(enable) {
    this.enableSharedContext = enable;
    console.log(`Shared context ${enable ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * NEW: Get shared context status
   * @returns {boolean} Whether shared context is enabled
   */
  isSharedContextEnabled() {
    return this.enableSharedContext;
  }
  
  /**
   * NEW: Clear shared context for a specific document
   * @param {string} documentId - Document ID
   */
  clearSharedContext(documentId) {
    if (this.importantSections.has(documentId)) {
      this.importantSections.delete(documentId);
      console.log(`Cleared shared context for document ${documentId}`);
    }
    
    // Also clear tracked sections in OllamaService
    if (this.ollamaService.contextTrackingEnabled) {
      this.ollamaService.clearTrackedSections(documentId);
    }
    
    // Clear bidirectional context
    if (this.sharedContextMap && this.sharedContextMap.has(documentId)) {
      this.sharedContextMap.delete(documentId);
      console.log(`Cleared bidirectional context for document ${documentId}`);
    }
  }
  
  /**
   * NEW: Get shared context information for a document
   * @param {string} documentId - Document ID
   * @returns {Object} Shared context info
   */
  getSharedContextInfo(documentId) {
    if (!this.importantSections.has(documentId)) {
      return {
        hasContext: false,
        sectionsCount: 0,
        enabled: this.enableSharedContext
      };
    }
    
    const sections = this.importantSections.get(documentId);
    return {
      hasContext: true,
      sectionsCount: sections.length,
      sectionTypes: [...new Set(sections.map(s => s.type))],
      enabled: this.enableSharedContext
    };
  }
  
  /**
   * NEW: Synchronize model settings between services
   * @returns {boolean} Success status
   */
  syncServiceConfigurations() {
    // Get current configurations
    const ollamaConfig = this.ollamaService.getConfig();
    const embeddingConfig = this.embeddingService.getConfig();
    
    // Share the base URL to ensure both services connect to same Ollama instance
    if (ollamaConfig.baseUrl !== embeddingConfig.baseUrl) {
      console.log(`Syncing service endpoints: Ollama ${ollamaConfig.baseUrl} -> Embedding Service`);
      this.embeddingService.setBaseUrl(ollamaConfig.baseUrl);
    }
    
    // Log current model configurations
    console.log(`Current model configuration - Text: ${ollamaConfig.defaultModel}, Embeddings: ${embeddingConfig.embeddingModel}`);
    
    return true;
  }
  
  /**
   * NEW: Establish shared context between text generation and embedding services
   * @param {string} documentId - Document ID
   * @param {string} text - Document text
   * @returns {Promise<boolean>} Success status
   */
  async establishSharedContext(documentId, text) {
    if (!this.enableSharedContext || !documentId || !text) return false;
    
    try {
      // 1. Initialize both services in parallel
      const [ollamaInitialized, embeddingInitialized] = await Promise.all([
        this.ollamaService.initialize(),
        this.embeddingService.initialize()
      ]);
      
      if (!ollamaInitialized || !embeddingInitialized) {
        console.warn('Failed to initialize AI services for shared context');
        return false;
      }
      
      // 2. Sync configurations
      this.syncServiceConfigurations();
      
      // 3. Tell Ollama service we'll be tracking important sections
      if (typeof this.ollamaService.enableContextTracking === 'function') {
        this.ollamaService.enableContextTracking(true);
      }
      
      // 4. Pre-analyze text for key medical document sections
      const keyMedicalSections = this.preAnalyzeForKeyMedicalSections(text);
      if (keyMedicalSections.length > 0) {
        console.log(`Pre-identified ${keyMedicalSections.length} key medical sections`);
        
        // Store these as initial important sections
        this.importantSections.set(documentId, keyMedicalSections);
      }
      
      // 5. Set up bidirectional context sharing
      this.setupBidirectionalContext(documentId);
      
      console.log(`Established shared context for document ${documentId}`);
      return true;
    } catch (error) {
      console.error('Failed to establish shared context:', error);
      return false;
    }
  }
  
  /**
   * NEW: Share tracked context from OllamaService with EmbeddingService
   * @param {string} documentId - Document ID
   */
  shareTrackedContext(documentId) {
    if (!this.enableSharedContext || !documentId) return;
    
    try {
      // Get tracked sections from OllamaService
      const trackedSections = this.ollamaService.getTrackedSections(documentId);
      
      if (trackedSections.length > 0) {
        console.log(`Sharing ${trackedSections.length} tracked sections with EmbeddingService`);
        
        // Transform tracked sections into format compatible with important sections
        const sharedSections = trackedSections.map((section, index) => {
          const sharedSection = {
            id: `tracked-${index}`,
            text: section.context,
            type: section.type,
            field: section.field,
            value: section.value,
            timestamp: section.timestamp
          };
          
          // Update bidirectional context
          this.updateSharedContext(documentId, 'ollama', {
            ...sharedSection,
            source: 'tracked'
          });
          
          return sharedSection;
        });
        
        // Add to existing important sections
        if (this.importantSections.has(documentId)) {
          const existingSections = this.importantSections.get(documentId);
          this.importantSections.set(documentId, [...existingSections, ...sharedSections]);
        } else {
          this.importantSections.set(documentId, sharedSections);
        }
        
        console.log(`Tracked context shared successfully for document ${documentId}`);
      }
    } catch (error) {
      console.error('Error sharing tracked context:', error);
    }
  }
  
  /**
   * Configure Ollama and Embedding services
   * @param {string} baseUrl - Base URL for Ollama API
   * @param {string} model - Model to use for text generation
   * @param {string} embeddingModel - Model to use for embeddings
   */
  configureOllama(baseUrl, model, embeddingModel = null) {
    // Configure Ollama service for text generation
    this.ollamaService.setBaseUrl(baseUrl);
    this.ollamaService.setDefaultModel(model);
    
    // Configure Embedding service with same base URL and embedding model
    this.embeddingService.setBaseUrl(baseUrl);
    if (embeddingModel) {
      this.embeddingService.setEmbeddingModel(embeddingModel);
    }
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
      
      // Update progress
      this.updateProgress('processing', 0.01, 'Starting', 'Beginning document processing');
      
      // Generate a unique ID early for context
      const id = Date.now().toString();
      
      // Initialize services with shared context
      await this.establishSharedContext(id, uri);
      
      // Initialize services - do this here to avoid unnecessary initialization
      await Promise.all([
        this.ollamaService.initialize(),
        this.embeddingService.initialize()
      ]);
      
      // Check if Ollama is available before starting
      try {
        this.updateProgress('processing', 0.05, 'Checking AI', 'Verifying AI model availability');
        
        const isConnected = await this.ollamaService.testConnection();
        if (!isConnected) {
          this.updateProgress('warning', 0.1, 'AI Unavailable', 'Ollama server not detected - extraction may be limited');
          console.warn('Ollama server not available');
        } else {
          console.log(`Using Ollama model: ${this.ollamaService.defaultModel}`);
          this.updateProgress('processing', 0.1, 'AI Ready', `Using model: ${this.ollamaService.defaultModel}`);
          
          // Check embedding model
          const embeddingModel = this.embeddingService.embeddingModel;
          if (embeddingModel) {
            console.log(`Using embedding model: ${embeddingModel}`);
            this.updateProgress('processing', 0.12, 'Embedding Model Ready', 
              `Using ${embeddingModel} for context matching`);
          }
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
      
      // Current date
      const date = new Date().toISOString().split('T')[0];
      
      // Extract the text from the extraction result
      const extractedText = extractionResult.text || '';
      
      this.updateProgress('processing', 0.3, 'Text Extracted', `Successfully processed ${extractionResult.pages} pages`);
      
      // Process document sections early for shared context
      const references = await this.processDocumentWithGranularSections(id, extractedText);
      
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
      if (extractedText && this.useAI) {
        try {
          console.log(`Using AI to extract information from ${extractedText.length} characters of text (${extractionResult.pages} pages)`);
          this.updateProgress('processing', 0.35, 'AI Extraction', 'Starting AI information extraction');
          
          // Check Ollama connection
          const testConnection = await this.ollamaService.testConnection();
          
          if (testConnection) {
            // Extract information using Ollama with the numbered list approach
            // Pass references for shared context
            const extractedInfo = await this.ollamaService.extractInformation(
              extractedText, 
              null, 
              null, 
              { documentId: id, references }
            );
            
            this.updateProgress('processing', 0.8, 'AI Complete', 'AI extraction completed successfully');
            
            if (extractedInfo && extractedInfo.extractionMethod !== 'failed') {
              console.log('Ollama extraction successful');
              console.log('Extracted fields:', Object.keys(extractedInfo).filter(k => 
                !k.startsWith('_') && k !== 'extractionMethod' && k !== 'extractionDate'
              ));
              
              // Merge the AI-extracted information with our default formData
              formData = { ...formData, ...extractedInfo };
              
              // Get important sections from extraction process
              await this.retrieveImportantSectionsFromExtractionProcess(id, formData, references);
              
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
      } else if (!extractedText) {
        console.error('No text was extracted from the document');
        this.updateProgress('error', 0.4, 'No Text Found', 'No readable text was extracted from the document');
        formData.extractionMethod = 'no_text';
        formData.error = 'No text was extracted from the document';
      } else if (!this.useAI) {
        console.log('AI extraction disabled');
        this.updateProgress('processing', 0.4, 'AI Disabled', 'AI extraction was disabled by settings');
        formData.extractionMethod = 'manual';
      }
      
      // Index sections by field values first
      if (formData && formData.extractionMethod !== 'failed') {
        console.log('Building field-section index for extracted values');
        const indexedFields = await this.indexSectionsByFieldValues(formData, references);
        console.log(`Indexed ${indexedFields} field values to sections`);
      }
      
      // Create field references with enhanced context sharing
      this.updateProgress('processing', 0.9, 'Creating References', 'Creating field references with shared context');
      await this.createFieldReferencesWithSharedContext(id, formData, extractedText, references);
      
      // Ensure embeddings exist for extracted fields
      if (formData && formData.extractionMethod !== 'failed') {
        console.log('Extracted information successfully, ensuring embeddings for extracted fields');
        await this.ensureEmbeddingsForExtractedFields(formData, references);
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
        references,
        sectionEmbeddings: references.sections.filter(s => s.embedding).length // Just store the count for debugging
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
   * Process document to create enhanced references with granular sections
   * Uses EmbeddingService for vector representations of sections
   * @param {string} documentId - Unique ID of the document
   * @param {string} documentText - Full text of the document
   * @returns {Promise<Object>} Reference metadata with granular sections
   */
  async processDocumentWithGranularSections(documentId, documentText) {
    // Skip if text is empty
    if (!documentText || documentText.trim() === '') {
      return { documentId, totalSections: 0, sections: [] };
    }
    
    // Split document into sections
    const sections = this.splitIntoGranularSections(documentText);
    
    // Create reference metadata
    const referenceData = {
      documentId,
      totalSections: sections.length,
      sections: sections.map((section, index) => ({
        id: `s-${index}`,
        text: section.text,
        index,
        type: section.type,
        // Calculate start and end position in the original text
        position: {
          start: documentText.indexOf(section.text),
          end: documentText.indexOf(section.text) + section.text.length
        }
      }))
    };
    
    // Generate embeddings for a subset of sections initially
    try {
      // Make sure embedding service is initialized
      await this.embeddingService.initialize();
      
      // Update progress
      this.updateProgress('processing', 0.92, 'Generating Embeddings', 'Creating semantic document index');
      
      // First, identify high-quality sections that are most likely to contain important info
      const highQualitySections = referenceData.sections.filter(s => 
        s.text && s.text.length > 0 && this.isHighQualitySection(s)
      );
      
      // Calculate how many sections to embed initially (at least 50% of high quality, up to 100)
      const initialSectionCount = Math.min(
        Math.max(20, Math.ceil(highQualitySections.length * 0.5)),
        100
      );
      
      console.log(`Will generate embeddings for ${initialSectionCount} of ${highQualitySections.length} high-quality sections`);
      
      // Sort sections by potential importance
      const prioritizedSections = [...highQualitySections].sort((a, b) => {
        // Prioritize sections with potential field values
        const aContainsPatient = /patient|name|dob|birth/i.test(a.text) ? 3 : 1;
        const bContainsPatient = /patient|name|dob|birth/i.test(b.text) ? 3 : 1;
        
        const aDiagnosis = /diagnosis|assessment|dx|condition/i.test(a.text) ? 3 : 1;
        const bDiagnosis = /diagnosis|assessment|dx|condition/i.test(b.text) ? 3 : 1;
        
        const aMeds = /medication|prescription|antibiotic|cardiac/i.test(a.text) ? 2 : 1;
        const bMeds = /medication|prescription|antibiotic|cardiac/i.test(b.text) ? 2 : 1;
        
        // Combined score
        const aScore = aContainsPatient * aDiagnosis * aMeds;
        const bScore = bContainsPatient * bDiagnosis * bMeds;
        
        return bScore - aScore;
      });
      
      // Select initial sections to embed
      const initialSections = prioritizedSections.slice(0, initialSectionCount);
      
      // Process initial sections with higher batch size
      const BATCH_SIZE = 10;
      for (let i = 0; i < initialSections.length; i += BATCH_SIZE) {
        const batch = initialSections.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel
        await Promise.all(batch.map(async (section) => {
          try {
            section.embedding = await this.embeddingService.getEmbedding(section.text);
          } catch (error) {
            console.warn(`Error generating embedding for section ${section.id}:`, error);
            // Continue without embedding for this section
          }
        }));
        
        // Update progress
        const progress = 0.92 + (0.08 * (Math.min(i + BATCH_SIZE, initialSections.length) / initialSections.length));
        this.updateProgress('processing', progress, 'Generating Embeddings', `Processed ${Math.min(i + BATCH_SIZE, initialSections.length)} of ${initialSections.length} sections`);
      }
      
      // Count successful embeddings
      const successfulEmbeddings = referenceData.sections.filter(s => s.embedding).length;
      console.log(`Generated embeddings for ${successfulEmbeddings}/${initialSections.length} initial sections`);
      
      // Starting a background process to generate embeddings for remaining important sections
      const remainingSections = highQualitySections.filter(s => !s.embedding);
      if (remainingSections.length > 0) {
        console.log(`Queuing ${remainingSections.length} remaining high-quality sections for background embedding`);
        this.backgroundEmbeddingGeneration(remainingSections);
      }
    } catch (error) {
      console.warn('Error generating section embeddings:', error);
      // Continue without embeddings
    }
    
    return referenceData;
  }
  
  /**
   * New method for background embedding generation
   */
  backgroundEmbeddingGeneration(sections) {
    if (!sections || sections.length === 0) return;
    
    // Start a background process
    setTimeout(async () => {
      try {
        console.log(`Starting background embedding generation for ${sections.length} sections`);
        
        // Ensure embedding service is initialized
        await this.embeddingService.initialize();
        
        // Process in larger batches for background work
        const BATCH_SIZE = 10;
        let processedCount = 0;
        
        for (let i = 0; i < sections.length; i += BATCH_SIZE) {
          const batch = sections.slice(i, i + BATCH_SIZE);
          
          // Process this batch
          const batchResults = await Promise.allSettled(batch.map(async (section) => {
            try {
              section.embedding = await this.embeddingService.getEmbedding(section.text);
              return true;
            } catch (error) {
              console.warn(`Background embedding generation failed for section:`, error);
              return false;
            }
          }));
          
          // Count successful generations
          const batchSuccesses = batchResults.filter(r => r.status === 'fulfilled' && r.value === true).length;
          processedCount += batchSuccesses;
          
          console.log(`Background generated ${batchSuccesses}/${batch.length} embeddings (total: ${processedCount}/${sections.length})`);
          
          // Add a small delay to avoid overloading
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`Background embedding generation complete: ${processedCount}/${sections.length} successful`);
      } catch (error) {
        console.error('Background embedding generation error:', error);
      }
    }, 0);
  }

  /**
   * Check if a section is high quality for initial embedding priority
   * @param {Object} section - Section to evaluate
   * @returns {boolean} Whether the section is high quality
   */
  isHighQualitySection(section) {
    if (!section || !section.text) return false;
    
    const text = section.text;
    const length = text.length;
    
    // Check if section is too short or too long
    if (length < 30 || length > 5000) return false; // Relaxed from 50-2000
    
    // Check for common OCR issues that indicate poor quality
    const badQualityIndicators = [
      // Too many non-alphanumeric characters relative to length
      text.replace(/[a-zA-Z0-9\s]/g, '').length > text.length * 0.4, // Increased from 0.3
      
      // Too many line breaks relative to length
      (text.match(/\n/g) || []).length > text.length / 15, // Relaxed from 20
      
      // Excessive punctuation
      (text.match(/[.,;:!?]/g) || []).length > text.length / 8, // Relaxed from 10
      
      // Repeated unusual character sequences - only consider longer repetitions
      /(.)\1{7,}/.test(text), // Increased from 5
      
      // Multiple non-word sequences - only look for longer ones
      (text.match(/[^\w\s]{5,}/g) || []).length > 0, // Increased from 3
      
      // Very low word-to-character ratio - relaxed
      text.split(/\s+/).length < text.length / 20, // Relaxed from 15
      
      // Too many numeric sequences - look for very long ones only
      (text.match(/\d{7,}/g) || []).length > 3 // Increased from 5
    ];
    
    // Section is low quality if any indicators are true
    const isLowQuality = badQualityIndicators.some(indicator => indicator === true);
    
    // Special override for sections likely containing field values
    if (isLowQuality) {
      // Check if it contains important medical terms that indicate values
      const importantTerms = [
        'patient:', 'name:', 'dob:', 'diagnosis:', 'insurance:', 
        'location:', 'medication:', 'treatment:', 'doctor:', 'discharge:',
        'lab:', 'wound:', 'cardiac:', 'history:', 'mental:'
      ];
      
      for (const term of importantTerms) {
        if (section.text.toLowerCase().includes(term)) {
          // Override the quality check for sections with field labels
          console.log(`Overriding quality check for section with important term: ${term}`);
          return true;
        }
      }
    }
    
    return !isLowQuality;
  }

  /**
   * Split document text into meaningful sections with type detection
   * @param {string} text - Document text
   * @returns {Array} Array of section objects with text and type
   */
  splitIntoGranularSections(text) {
    // Split by double newlines first
    const paragraphs = text.split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    // Group paragraphs into sections based on headers
    const sections = [];
    let currentSection = { text: '', type: 'General' };
    
    // Keywords that indicate specific section types
    const sectionKeywords = {
      'Patient Information': ['patient', 'name', 'dob', 'date of birth', 'demographics', 'personal'],
      'Insurance': ['insurance', 'coverage', 'policy', 'payer', 'financial'],
      'Diagnosis': ['diagnosis', 'dx', 'impression', 'assessment', 'problem', 'condition'],
      'Provider': ['provider', 'physician', 'doctor', 'pcp', 'attending', 'consultant'],
      'Medications': ['medication', 'med', 'prescription', 'drug', 'antibiotic', 'cardiac'],
      'History': ['history', 'hx', 'past medical', 'pmh', 'previous'],
      'Physical Exam': ['examination', 'exam', 'physical', 'findings', 'wound', 'vitals'],
      'Labs': ['laboratory', 'lab', 'test', 'results', 'values', 'blood work'],
      'Discharge': ['discharge', 'dc', 'disposition', 'follow-up', 'follow up'],
      'Mental Status': ['mental', 'psychiatric', 'psychological', 'cognitive', 'mood', 'behavior'],
      'Treatment': ['treatment', 'plan', 'recommendation', 'intervention', 'therapy']
    };
    
    // Process each paragraph
    for (const paragraph of paragraphs) {
      // Skip empty paragraphs
      if (!paragraph) continue;
      
      // Skip page markers
      if (paragraph.startsWith('---') && paragraph.includes('Page')) {
        continue;
      }
      
      // Check if this looks like a header
      const isHeader = this.isLikelyHeader(paragraph);
      
      if (isHeader) {
        // Save previous section if there is content
        if (currentSection.text) {
          sections.push({ ...currentSection });
        }
        
        // Start a new section
        const sectionType = this.determineSectionType(paragraph, sectionKeywords);
        currentSection = {
          text: paragraph,
          type: sectionType
        };
      } else {
        // Add to current section with a separator if needed
        if (currentSection.text.length > 0) {
          currentSection.text += '\n\n';
        }
        currentSection.text += paragraph;
      }
    }
    
    // Add the last section
    if (currentSection.text.length > 0) {
      sections.push(currentSection);
    }
    
    // For sections that are too large, try to split them further
    const refinedSections = [];
    const MAX_SECTION_LENGTH = 800; // Characters
    
    for (const section of sections) {
      if (section.text.length > MAX_SECTION_LENGTH) {
        // Try to split into smaller subsections
        const subsections = this.splitLargeSection(section.text, section.type);
        refinedSections.push(...subsections);
      } else {
        refinedSections.push(section);
      }
    }
    
    return refinedSections;
  }
  
  /**
   * Check if text is likely to be a header
   * @param {string} text - Text to check
   * @returns {boolean} Whether text is likely a header
   */
  isLikelyHeader(text) {
    // Headers are often short, all uppercase, or end with a colon
    return (
      // All uppercase short text
      (text === text.toUpperCase() && text.length < 50) ||
      // Ends with colon
      text.endsWith(':') ||
      // Capitalized word followed by colon
      /^[A-Z][A-Za-z\s]{0,20}:/.test(text) ||
      // Roman numerals
      /^[IVX]+\.\s/.test(text) ||
      // Numbered section
      /^\d+\.\s/.test(text) ||
      // Very short line (likely a title)
      (text.length < 30 && text.split(/\s+/).length <= 5)
    );
  }
  
  /**
   * Split a large section into smaller subsections
   * @param {string} text - Section text
   * @param {string} parentType - Parent section type
   * @returns {Array} Array of subsections
   */
  splitLargeSection(text, parentType) {
    // Split by sentences or paragraph breaks
    const sentences = text.split(/(?<=[.!?])\s+/);
    const subsections = [];
    let currentSubsection = { text: '', type: parentType };
    let currentLength = 0;
    const TARGET_LENGTH = 400; // Target subsection length
    
    for (const sentence of sentences) {
      if (currentLength + sentence.length > TARGET_LENGTH && currentLength > 0) {
        // Finalize current subsection
        subsections.push({ ...currentSubsection });
        
        // Start new subsection
        currentSubsection = { 
          text: sentence, 
          type: `${parentType} (cont.)` 
        };
        currentLength = sentence.length;
      } else {
        // Add to current subsection with a space if needed
        if (currentLength > 0) {
          currentSubsection.text += ' ';
        }
        currentSubsection.text += sentence;
        currentLength += sentence.length;
      }
    }
    
    // Add the last subsection
    if (currentSubsection.text.length > 0) {
      subsections.push(currentSubsection);
    }
    
    return subsections;
  }
  
  /**
   * Determine the type of a section based on its content
   * @param {string} text - Section text
   * @param {Object} sectionKeywords - Keywords for each section type
   * @returns {string} Section type
   */
  determineSectionType(text, sectionKeywords) {
    const lowerText = text.toLowerCase();
    
    // Check for known section types based on keywords
    for (const [type, keywords] of Object.entries(sectionKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return type;
        }
      }
    }
    
    // Custom detection for common section headers
    if (lowerText.includes('patient') && (lowerText.includes('information') || lowerText.includes('details'))) {
      return 'Patient Information';
    }
    
    if (lowerText.includes('referring') && (lowerText.includes('physician') || lowerText.includes('doctor'))) {
      return 'Referring Physician';
    }
    
    if (lowerText.includes('diagnosis') || lowerText.includes('assessment') || lowerText.includes('impression')) {
      return 'Diagnosis';
    }
    
    if (lowerText.includes('history')) {
      return 'Medical History';
    }
    
    if (lowerText.includes('medication') || lowerText.includes('prescription')) {
      return 'Medications';
    }
    
    if (lowerText.includes('insurance')) {
      return 'Insurance Information';
    }
    
    if (lowerText.includes('reason') && lowerText.includes('referral')) {
      return 'Referral Reason';
    }
    
    // Default section type
    return 'Document Section';
  }
  
  /**
   * Create field references with granular sections
   * Uses EmbeddingService for more accurate matching with enhanced context
   * @param {Object} formData - Extracted form data
   * @param {string} text - Full document text
   * @param {Object} references - Document references with granular sections
   */
  async createFieldReferencesWithGranularSections(formData, text, references) {
    // Skip if no references or sections
    if (!references || !references.sections || references.sections.length === 0) {
      return;
    }
    
    // Ensure _references exists
    if (!formData._references) {
      formData._references = {};
    }
    
    console.log(`Creating enhanced field references using ${references.sections.length} granular sections`);
    
    // Check if we have a field-section index
    const hasFieldIndex = references.fieldSectionIndex && references.fieldSectionIndex.size > 0;
    
    // For each field with content, find the most specific section that matches
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
        console.log(`Finding context for field ${field}`);
        
        // NEW: First check if we have direct indexed sections for this field
        if (hasFieldIndex && references.fieldSectionIndex.has(field)) {
          const indexedSections = references.fieldSectionIndex.get(field);
          console.log(`Using ${indexedSections.length} indexed sections for ${field}`);
          
          // Ensure at least the first section has an embedding
          if (indexedSections.length > 0 && !indexedSections[0].embedding) {
            try {
              indexedSections[0].embedding = await this.embeddingService.getEmbeddingOnDemand(indexedSections[0].text, true);
            } catch (error) {
              console.warn(`Failed to generate embedding for indexed section:`, error);
            }
          }
          
          // If we have any sections with embeddings, use those for matching
          const sectionsWithEmbeddings = indexedSections.filter(s => s.embedding);
          
          if (sectionsWithEmbeddings.length > 0) {
            // Use semantic matching with indexed sections
            const relevantTypeIds = getRelatedSectionTypesForField(field);
            const matchResults = await this.embeddingService.findContextForField(
              value, 
              sectionsWithEmbeddings, 
              field, 
              relevantTypeIds
            );
            
            if (matchResults && matchResults.length > 0) {
              // Process results as usual
              const bestMatch = matchResults[0];
              
              formData._references[field] = {
                text: this.extractCoherentContext(bestMatch.section.text, value),
                location: bestMatch.section.type || bestMatch.section.type,
                matchType: 'indexed-semantic',
                score: bestMatch.score,
                explanation: bestMatch.explanation || `This ${field} information was found in an indexed section with ${Math.round(bestMatch.score * 100)}% confidence.`
              };
              
              console.log(`Found indexed semantic match for ${field} with score ${bestMatch.score}`);
              
              // Skip to next field since we found a match
              continue;
            }
          }
          
          // If semantic matching failed, use the first indexed section directly
          if (indexedSections.length > 0) {
            const bestSection = indexedSections[0];
            
            formData._references[field] = {
              text: this.extractCoherentContext(bestSection.text, value),
              location: bestSection.type || 'Indexed Section',
              matchType: 'indexed-direct',
              score: 0.7, // Good confidence score for direct index match
              explanation: `This ${field} was found directly in the document. The exact value "${value}" appears in this section.`
            };
            
            console.log(`Using direct indexed section for ${field}`);
            
            // Skip to next field
            continue;
          }
        }
        
        // Get relevant section type IDs for this field from SectionTypes
        const relevantTypeIds = getRelatedSectionTypesForField(field);
        
        // Use enhanced context matching from EmbeddingService
        const sections = references.sections.filter(section => 
          section.text && section.text.length > 0 && this.isHighQualitySection(section)
        );
        
        // If too few quality sections, fall back to all sections
        const sectionsToUse = sections.length > references.sections.length * 0.4 
                            ? sections 
                            : references.sections.filter(s => s.text && s.text.length > 0);
        
        // Check if ANY sections have embeddings
        const sectionsWithEmbeddings = sectionsToUse.filter(s => s.embedding);
        
        if (sectionsWithEmbeddings.length === 0) {
          console.log(`No sections have embeddings for field ${field}, generating on-demand`);
          
          // Try to generate embeddings for sections containing this value first
          const sectionsWithValue = sectionsToUse.filter(s => 
            s.text.toLowerCase().includes(value.toLowerCase())
          );
          
          if (sectionsWithValue.length > 0) {
            console.log(`Found ${sectionsWithValue.length} sections containing "${value.substring(0, 20)}..."`);
            
            // Generate embeddings for these critical sections
            for (const section of sectionsWithValue.slice(0, 5)) { // Limit to 5
              try {
                section.embedding = await this.embeddingService.getEmbeddingOnDemand(section.text, true);
                console.log(`Generated on-demand embedding for section containing field value`);
              } catch (error) {
                console.warn(`Failed to generate on-demand embedding:`, error);
              }
            }
          }
          
          // Also generate embedding for other important sections
          if (relevantTypeIds && relevantTypeIds.length > 0) {
            const relevantSections = sectionsToUse.filter(s => 
              !s.embedding && relevantTypeIds.includes(s.typeId)
            ).slice(0, 5); // Limit to 5
            
            for (const section of relevantSections) {
              try {
                section.embedding = await this.embeddingService.getEmbeddingOnDemand(section.text);
                console.log(`Generated on-demand embedding for relevant section type`);
              } catch (error) {
                console.warn(`Failed to generate embedding for relevant section:`, error);
              }
            }
          }
        }
        
        // Use the regular context finder with updated sections 
        const matchResults = await this.embeddingService.findContextForField(
          value, 
          sectionsToUse, 
          field, 
          relevantTypeIds
        );
        
        if (matchResults && matchResults.length > 0) {
          // Process matches...
          const bestMatch = matchResults[0];
          
          formData._references[field] = {
            text: this.extractCoherentContext(bestMatch.section.text, value),
            location: bestMatch.section.type || SectionType.getName(bestMatch.section.typeId || 0),
            matchType: 'enhanced-semantic',
            score: bestMatch.score,
            explanation: bestMatch.explanation,
            sectionTypeId: bestMatch.section.typeId || 0
          };
          
          // Add a human-readable explanation
          if (!formData._references[field].explanation) {
            formData._references[field].explanation = this.generateFieldExtractionExplanation(
              field, value, formData._references[field]
            );
          }
        } else {
          // Stronger fallback: Check if we have a field reference after all matching attempts
          console.log(`No context found for ${field}, using aggressive string matching fallback`);
          
          // Look for exact text match first
          let matchingSections = references.sections.filter(section => 
            section.text && section.text.includes(value)
          );
          
          // If that fails, try case-insensitive matching
          if (matchingSections.length === 0) {
            matchingSections = references.sections.filter(section => 
              section.text && section.text.toLowerCase().includes(value.toLowerCase())
            );
          }
          
          // If we found any matches, use the shortest one (most specific)
          if (matchingSections.length > 0) {
            // Sort by length (shorter first for more focused context)
            matchingSections.sort((a, b) => a.text.length - b.text.length);
            
            const bestMatch = matchingSections[0];
            
            // Create reference with direct text match
            formData._references[field] = {
              text: this.extractCoherentContext(bestMatch.text, value),
              location: bestMatch.type || 'Document Section',
              matchType: 'direct-text-match',
              score: 0.5, // Medium confidence score
              explanation: `This ${field} information was found through direct text matching because embeddings were not available.`
            };
            
            console.log(`Created direct text match reference for ${field}`);
          } else {
            // Last resort: Extract surrounding context from full document text
            console.log(`No section contains ${field} value, searching full document`);
            const valueIndex = text.indexOf(value);
            
            if (valueIndex >= 0) {
              // Extract some context around the value
              const contextStart = Math.max(0, valueIndex - 150);
              const contextEnd = Math.min(text.length, valueIndex + value.length + 150);
              const contextText = text.substring(contextStart, contextEnd);
              
              // Create reference from full text
              formData._references[field] = {
                text: contextText,
                location: 'Full Document Context',
                matchType: 'document-text-match',
                score: 0.3, // Lower confidence score
                explanation: `The source for this ${field} was found in the document but couldn't be traced to a specific section.`
              };
              
              console.log(`Created document-level text match reference for ${field}`);
            } else {
              // Create an empty reference so the UI knows we tried
              formData._references[field] = {
                text: 'No source context available for this field.',
                location: 'Unknown',
                matchType: 'no-match',
                score: 0,
                explanation: `This information could not be traced to a specific location in the document.`
              };
              
              console.log(`No match found for ${field} anywhere in document`);
            }
          }
        }
        
        // Apply OCR text cleanup to improve readability of all references
        if (formData._references[field] && formData._references[field].text) {
          formData._references[field].text = this.cleanupOcrText(formData._references[field].text);
        }
      } catch (error) {
        console.warn(`Error finding enhanced context for field ${field}:`, error);
        // Try fallback to exact match on error
        this.findExactTextMatch(field, value, references, formData);
      }
    }
    
    console.log(`Created enhanced contextual references for ${Object.keys(formData._references).length} fields`);
  }
  
  /**
   * Find exact text match for a field (fallback approach)
   * @param {string} field - Field name
   * @param {string} value - Field value
   * @param {Object} references - Document references
   * @param {Object} formData - Form data to update
   */
  findExactTextMatch(field, value, references, formData) {
    // First look for exact value matches in sections
    const exactMatches = references.sections.filter(section => 
      section.text && section.text.includes(value)
    );
    
    if (exactMatches.length > 0) {
      // Sort by text length (shorter is more specific)
      exactMatches.sort((a, b) => a.text.length - b.text.length);
      
      // Use the most specific (shortest) match
      formData._references[field] = {
        text: exactMatches[0].text,
        location: exactMatches[0].type,
        matchType: 'exact',
        score: 1.0 // Maximum score for exact matches
      };
    }
  }
  
  /**
   * Extract relevant text snippet around a value
   * @param {string} fullText - Full text to extract from
   * @param {string} value - Value to find
   * @param {number} contextSize - Characters of context before and after
   * @returns {string} Extracted snippet
   */
  extractRelevantTextSnippet(fullText, value, contextSize = 100) {
    if (!fullText || !value) return fullText;
    
    // Find the position of the value in the text
    const index = fullText.toLowerCase().indexOf(value.toLowerCase());
    
    if (index === -1) return fullText; // Value not found
    
    // Calculate start and end positions with context
    const start = Math.max(0, index - contextSize);
    const end = Math.min(fullText.length, index + value.length + contextSize);
    
    // Extract the snippet
    let snippet = fullText.substring(start, end).trim();
    
    // Add ellipsis if we trimmed the text
    if (start > 0) snippet = '...' + snippet;
    if (end < fullText.length) snippet = snippet + '...';
    
    return snippet;
  }
  
  /**
   * Clean up OCR text to improve readability
   * @param {string} text - Text to clean up
   * @returns {string} Cleaned text
   */
  cleanupOcrText(text) {
    if (!text) return '';
    
    let cleaned = text;
    
    // Replace repeated special characters
    cleaned = cleaned.replace(/([^\w\s])\1{2,}/g, '$1');
    
    // Fix obvious OCR errors with spacing
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Fix missing spaces after periods, commas
    cleaned = cleaned.replace(/([.,:;])([a-zA-Z])/g, '$1 $2');
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    
    // Fix common OCR errors
    const ocrFixes = {
      'I\\)': '1)', 'l\\)': '1)', 'O\\)': '0)',
      'rn': 'm', 'cl': 'd', '\\|\\|': 'H',
      'S\\)': '5)', 'Z\\)': '2)'
    };
    
    for (const [error, fix] of Object.entries(ocrFixes)) {
      const regex = new RegExp(error, 'g');
      cleaned = cleaned.replace(regex, fix);
    }
    
    return cleaned;
  }
  
  /**
   * Extract significant keywords from text
   * @param {string} text - Text to analyze
   * @returns {Array} Weighted keywords
   */
  extractSignificantKeywords(text) {
    if (!text || typeof text !== 'string') return [];
    
    // Split into words
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 1);
    
    // Remove common stopwords
    const stopwords = ['the', 'and', 'is', 'in', 'to', 'with', 'for', 'on', 'at', 'from', 
                       'this', 'that', 'these', 'those', 'it', 'its', 'was', 'were', 'be', 
                       'been', 'has', 'have', 'had', 'do', 'does', 'did', 'a', 'an', 'by', 
                       'but', 'or', 'as', 'of', 'are', 'not', 'no', 'nor'];
    
    const filteredWords = words.filter(word => !stopwords.includes(word));
    
    // Calculate word frequency
    const wordFrequency = {};
    for (const word of filteredWords) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
    
    // Convert to weighted keywords
    const keywords = Object.entries(wordFrequency).map(([term, count]) => {
      // Calculate weight based on length and frequency
      const lengthWeight = Math.min(term.length / 2, 2);  // Longer words are more important
      const frequencyWeight = Math.min(count, 3);         // More frequent words are more important
      
      // Adjust weight for medical terms
      const medicalTerms = ['diagnosis', 'patient', 'provider', 'medication', 'treatment', 
                           'doctor', 'nurse', 'hospital', 'clinic', 'referral', 'labs', 
                           'results', 'test', 'symptoms', 'condition', 'wound', 'cardiac',
                           'history', 'assessment', 'discharge', 'admitted', 'care', 'medical'];
      
      const isMedicalTerm = medicalTerms.some(mt => term.includes(mt) || mt.includes(term));
      const medicalBoost = isMedicalTerm ? 1.5 : 1.0;
      
      return {
        term,
        count,
        weight: lengthWeight * frequencyWeight * medicalBoost
      };
    });
    
    // Sort by weight (highest first)
    keywords.sort((a, b) => b.weight - a.weight);
    
    // Return top keywords (up to 10)
    return keywords.slice(0, 10);
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
      
      // Clear shared context for this document
      this.clearSharedContext(id);
      
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
   * Ensure embeddings exist for sections containing extracted field values
   * @param {Object} formData - Extracted form data
   * @param {Object} references - Document references with sections
   */
  async ensureEmbeddingsForExtractedFields(formData, references) {
    // Skip if no references or extracted data
    if (!references || !references.sections || !formData) {
      return;
    }
    
    console.log('Ensuring embeddings exist for sections containing extracted fields');
    
    // Collect all field values
    const fieldValues = [];
    for (const [field, value] of Object.entries(formData)) {
      // Skip metadata fields or empty values
      if (field.startsWith('_') || 
          field === 'extractionMethod' || 
          field === 'extractionDate' || 
          field === 'error' ||
          !value || 
          typeof value !== 'string' || 
          value.trim() === '') {
        continue;
      }
      
      fieldValues.push({field, value});
    }
    
    // Find sections containing these values
    const sectionsWithValues = new Map(); // Map section ID to field/value pairs
    
    for (const {field, value} of fieldValues) {
      // Find sections containing this value
      const matchingSections = references.sections.filter(section => 
        section.text && section.text.includes(value)
      );
      
      for (const section of matchingSections) {
        if (!sectionsWithValues.has(section.id)) {
          sectionsWithValues.set(section.id, []);
        }
        sectionsWithValues.get(section.id).push({field, value});
      }
    }
    
    console.log(`Found ${sectionsWithValues.size} sections containing extracted field values`);
    
    // Generate embeddings for these sections if they don't already have them
    const sectionsNeedingEmbeddings = references.sections.filter(section => 
      !section.embedding && sectionsWithValues.has(section.id)
    );
    
    console.log(`Generating embeddings for ${sectionsNeedingEmbeddings.length} sections with extracted values`);
    
    // Generate embeddings in smaller batches to ensure completion
    const BATCH_SIZE = 5;
    for (let i = 0; i < sectionsNeedingEmbeddings.length; i += BATCH_SIZE) {
      const batch = sectionsNeedingEmbeddings.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (section) => {
        try {
          section.embedding = await this.embeddingService.getEmbedding(section.text);
          console.log(`Generated embedding for section with fields: ${sectionsWithValues.get(section.id).map(f => f.field).join(', ')}`);
        } catch (error) {
          console.warn(`Error generating embedding for section with extracted values:`, error);
          // Try with a smaller text sample if the full section fails
          try {
            const shortenedText = section.text.substring(0, 2000);
            section.embedding = await this.embeddingService.getEmbedding(shortenedText);
            console.log(`Generated embedding using shortened text for section with fields: ${sectionsWithValues.get(section.id).map(f => f.field).join(', ')}`);
          } catch (innerError) {
            console.error(`Failed to generate embedding even with shortened text:`, innerError);
          }
        }
      }));
    }
    
    // Count how many sections now have embeddings
    const sectionsWithEmbeddings = sectionsNeedingEmbeddings.filter(s => s.embedding).length;
    console.log(`Successfully generated embeddings for ${sectionsWithEmbeddings}/${sectionsNeedingEmbeddings.length} sections with extracted values`);
  }

  /**
   * Index sections by field values to ensure direct mapping
   * @param {Object} formData - Extracted form data  
   * @param {Object} references - Document references with sections
   * @returns {number} Number of indexed fields
   */
  async indexSectionsByFieldValues(formData, references) {
    // Skip if no data
    if (!formData || !references || !references.sections) {
      return 0;
    }
    
    console.log('Building field-section index for direct context mapping');
    
    // Create index map from fields to sections
    const fieldToSections = new Map();
    
    // For each field with a value
    for (const [field, value] of Object.entries(formData)) {
      // Skip metadata fields or empty values
      if (field.startsWith('_') || 
          field === 'extractionMethod' || 
          field === 'extractionDate' || 
          field === 'error' ||
          !value || 
          typeof value !== 'string' || 
          value.trim() === '') {
        continue;
      }
      
      // Find sections containing this value (case-insensitive)
      const matchingSections = references.sections.filter(section => 
        section.text && section.text.toLowerCase().includes(value.toLowerCase())
      );
      
      if (matchingSections.length > 0) {
        fieldToSections.set(field, matchingSections);
        console.log(`Indexed ${matchingSections.length} sections for ${field}`);
      } else {
        console.log(`No sections contain the value for ${field}`);
      }
    }
    
    // Store field-section mappings in references for later use
    references.fieldSectionIndex = fieldToSections;
    
    return fieldToSections.size; // Number of indexed fields
  }
  
  /**
   * Determines if a section is high quality for context
   * Identifies jumbled OCR text and low-quality sections
   * @param {Object} section - The section to evaluate
   * @returns {boolean} Whether the section is high quality
   */
  isHighQualitySection(section) {
    if (!section || !section.text) return false;
    
    const text = section.text;
    
    // Check for common OCR issues that indicate poor quality
    const badQualityIndicators = [
      // Too many non-alphanumeric characters relative to length
      text.replace(/[a-zA-Z0-9\s]/g, '').length > text.length * 0.3,
      
      // Too many line breaks relative to length
      (text.match(/\n/g) || []).length > text.length / 20,
      
      // Excessive punctuation
      (text.match(/[.,;:!?]/g) || []).length > text.length / 10,
      
      // Repeated unusual character sequences
      /(.)\1{5,}/.test(text),
      
      // Multiple non-word sequences
      (text.match(/[^\w\s]{3,}/g) || []).length > 0,
      
      // Very low word-to-character ratio (may indicate garbage OCR)
      text.split(/\s+/).length < text.length / 15,
      
      // Too many numeric sequences (may be scan artifacts)
      (text.match(/\d{5,}/g) || []).length > 3
    ];
    
    // Section is low quality if any indicators are true
    return !badQualityIndicators.some(indicator => indicator === true);
  }
  
  /**
   * Extract better context for a field by finding coherent text passages
   * @param {Object} formData - Extracted form data
   * @param {string} fieldName - Field name to find context for
   * @param {Array} sections - Document sections
   * @param {Object} embeddingService - Embedding service for similarity
   * @returns {Promise<Object>} Enhanced context with human-readable explanation
   */
  async extractEnhancedFieldContext(formData, fieldName, sections, embeddingService) {
    if (!formData || !fieldName || !sections || !sections.length) {
      return null;
    }
    
    const fieldValue = formData[fieldName];
    if (!fieldValue || typeof fieldValue !== 'string' || !fieldValue.trim()) {
      return null;
    }
    
    try {
      // Filter to only high-quality sections
      const qualitySections = sections.filter(this.isHighQualitySection);
      
      // If too few quality sections, use all sections
      const sectionsToUse = qualitySections.length > sections.length * 0.4 ? qualitySections : sections;
      
      // Get embeddings for the field value
      const fieldEmbedding = await embeddingService.getEmbedding(fieldValue);
      
      // Find similar sections with human reasoning
      const similarSections = await embeddingService.findSimilarItems(
        fieldEmbedding,
        sectionsToUse, 
        section => section.embedding,
        3 // Top 3 matches
      );
      
      if (!similarSections.length) {
        return {
          text: null,
          explanation: `No context found for ${fieldName}.`,
          confidence: 0
        };
      }
      
      // Get most similar section
      const topMatch = similarSections[0];
      
      // Check if there's a relevant section type for this field
      const relevantTypeIds = getRelatedSectionTypesForField(fieldName);
      
      // Find best match from relevant section types
      const typedMatch = similarSections.find(({ item }) => 
        relevantTypeIds.includes(item.typeId) && item.score > 0.4
      );
      
      // Use the typed match if available and has decent score
      const bestMatch = typedMatch || topMatch;
      
      // Prepare explanation based on match quality
      let explanation;
      
      if (bestMatch.score > 0.8) {
        explanation = `This information was found in the "${SectionType.getName(bestMatch.item.typeId)}" section with high confidence (${Math.round(bestMatch.score * 100)}%).`;
      } else if (bestMatch.score > 0.6) {
        explanation = `This information appears to come from the "${SectionType.getName(bestMatch.item.typeId)}" section with moderate confidence (${Math.round(bestMatch.score * 100)}%).`;
      } else if (bestMatch.score > 0.4) {
        explanation = `This information may be related to content found in the "${SectionType.getName(bestMatch.item.typeId)}" section, but with lower confidence (${Math.round(bestMatch.score * 100)}%).`;
      } else {
        explanation = `The source of this information is unclear. It may be inferred from multiple sections of the document.`;
      }
      
      // Add direct mention if the section explicitly contains the exact field value
      if (bestMatch.item.text.includes(fieldValue)) {
        explanation += ` The exact value "${fieldValue}" is present in this section.`;
      }
      
      // Extract coherent context (not just random OCR text)
      const context = this.extractCoherentContext(bestMatch.item.text, fieldValue);
      
      return {
        text: context,
        explanation,
        confidence: bestMatch.score,
        sectionTypeId: bestMatch.item.typeId,
        sectionType: SectionType.getName(bestMatch.item.typeId)
      };
    } catch (error) {
      console.error(`Error extracting enhanced context for ${fieldName}:`, error);
      return null;
    }
  }
  
  /**
   * Extract a coherent context passage around a field value
   * Instead of just grabbing surrounding text, finds coherent paragraphs
   * @param {string} text - Full section text
   * @param {string} value - Field value to find context for
   * @returns {string} Coherent context
   */
  extractCoherentContext(text, value) {
    if (!text || !value) return text;
    
    // Find position of value in text (case-insensitive)
    const lowerText = text.toLowerCase();
    const lowerValue = value.toLowerCase();
    const index = lowerText.indexOf(lowerValue);
    
    if (index === -1) return text; // Value not found
    
    // Find paragraph boundaries
    // Look for paragraph breaks before and after the match
    let paragraphStart = text.lastIndexOf('\n\n', index);
    if (paragraphStart === -1) paragraphStart = 0;
    else paragraphStart += 2; // Skip the newlines
    
    let paragraphEnd = text.indexOf('\n\n', index + value.length);
    if (paragraphEnd === -1) paragraphEnd = text.length;
    
    // Get full paragraph
    let paragraph = text.substring(paragraphStart, paragraphEnd).trim();
    
    // If paragraph is too long, extract a window around the value
    if (paragraph.length > 400) {
      // Find a sentence boundary before the value
      let sentenceStart = Math.max(0, index - 200);
      const prevPeriod = text.lastIndexOf('.', index);
      if (prevPeriod > sentenceStart) {
        sentenceStart = prevPeriod + 1;
      }
      
      // Find a sentence boundary after the value
      let sentenceEnd = Math.min(text.length, index + value.length + 200);
      const nextPeriod = text.indexOf('.', index + value.length);
      if (nextPeriod !== -1 && nextPeriod < sentenceEnd) {
        sentenceEnd = nextPeriod + 1;
      }
      
      paragraph = text.substring(sentenceStart, sentenceEnd).trim();
    }
    
    // Add ellipsis if we trimmed the text
    if (paragraphStart > 0) paragraph = '...' + paragraph;
    if (paragraphEnd < text.length) paragraph = paragraph + '...';
    
    // Cleanup final context
    return this.cleanupOcrText(paragraph);
  }
  
  /**
   * Generate human-readable explanation of field extraction
   * @param {string} fieldName - Field name 
   * @param {string} fieldValue - Extracted value
   * @param {Object} context - Context information
   * @returns {string} Human readable explanation
   */
  generateFieldExtractionExplanation(fieldName, fieldValue, context) {
    if (!context) {
      return `No clear source was found for this information.`;
    }
    
    const confidence = context.confidence || 0;
    const sectionType = context.sectionType || 'unknown section';
    
    // Create an appropriate explanation based on confidence and context
    if (confidence > 0.8) {
      return `This ${fieldName} information was extracted from the ${sectionType} with high confidence. The AI found a strong match between "${fieldValue}" and text in this section.`;
    } else if (confidence > 0.6) {
      return `This ${fieldName} value was found in the ${sectionType} with moderate confidence. The information appears to be accurate but may benefit from verification.`;
    } else if (confidence > 0.4) {
      return `This ${fieldName} information may be related to content in the ${sectionType}, but with lower confidence. Please verify this information against the source document.`;
    } else {
      return `The source of this ${fieldName} information is unclear. It may be inferred from multiple sections or limited context. This field should be carefully verified.`;
    }
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
  
  /**
   * NEW: Retrieve important sections from extraction process
   * @param {string} documentId - Document ID
   * @param {Object} formData - Extracted form data
   * @param {Object} references - Document references
   */
  async retrieveImportantSectionsFromExtractionProcess(documentId, formData, references) {
    // Skip if shared context is disabled
    if (!this.enableSharedContext) return;
    
    try {
      // Try to get important context from Ollama service
      if (typeof this.ollamaService.getImportantContext === 'function') {
        const importantContext = await this.ollamaService.getImportantContext(documentId);
        
        if (importantContext && importantContext.fieldContexts) {
          // Store in our tracking map
          this.importantSections.set(documentId, importantContext.fieldContexts);
          
          console.log(`Retrieved ${Object.keys(importantContext.fieldContexts).length} important field contexts from extraction process`);
          
          // Queue important sections for immediate embedding
          await this.prioritizeEmbeddingsForImportantSections(documentId, references);
        }
      } else {
        // Fallback: identify important sections based on extracted values
        this.identifyImportantSectionsFromExtractedValues(documentId, formData, references);
      }
    } catch (error) {
      console.warn('Error retrieving important sections from extraction process:', error);
      // Fallback to identifying sections from values
      this.identifyImportantSectionsFromExtractedValues(documentId, formData, references);
    }
  }
  
  /**
   * Fallback method to identify important sections based on extracted values
   * @param {string} documentId - Document ID
   * @param {Object} formData - Extracted form data
   * @param {Object} references - Document references
   */
  identifyImportantSectionsFromExtractedValues(documentId, formData, references) {
    if (!formData || !references || !references.sections) return;
    
    const fieldContexts = new Map();
    
    // For each extracted field with a value
    Object.entries(formData).forEach(([field, value]) => {
      // Skip metadata fields or empty values
      if (field.startsWith('_') || 
          field === 'extractionMethod' || 
          field === 'extractionDate' || 
          !value || 
          typeof value !== 'string' || 
          value.trim() === '') {
        return;
      }
      
      // Find sections containing this value
      const matchingSections = references.sections.filter(section => 
        section.text && section.text.toLowerCase().includes(value.toLowerCase())
      );
      
      if (matchingSections.length > 0) {
        fieldContexts.set(field, matchingSections.map(s => s.id));
        console.log(`Found ${matchingSections.length} sections containing value for ${field}`);
      }
    });
    
    // Store the identified contexts
    this.importantSections.set(documentId, fieldContexts);
    
    console.log(`Identified ${fieldContexts.size} important field contexts by value matching`);
  }
  
  /**
   * Method to prioritize embeddings for important sections
   * @param {string} documentId - Document ID
   * @param {Object} references - Document references
   */
  async prioritizeEmbeddingsForImportantSections(documentId, references) {
    const fieldContexts = this.importantSections.get(documentId);
    if (!fieldContexts || !references || !references.sections) return;
    
    const importantSectionIds = new Set();
    
    // Collect all important section IDs
    fieldContexts.forEach((sectionIds) => {
      sectionIds.forEach(id => importantSectionIds.add(id));
    });
    
    console.log(`Prioritizing embeddings for ${importantSectionIds.size} important sections`);
    
    // Get the sections by ID
    const importantSections = references.sections.filter(section => 
      importantSectionIds.has(section.id)
    );
    
    // Generate embeddings for important sections first
    let successCount = 0;
    await Promise.all(importantSections.map(async (section) => {
      if (!section.embedding) {
        try {
          section.embedding = await this.embeddingService.getEmbedding(section.text);
          successCount++;
        } catch (error) {
          console.warn(`Failed to generate embedding for important section ${section.id}:`, error);
        }
      }
    }));
    
    console.log(`Generated embeddings for ${successCount}/${importantSections.length} important sections`);
  }
  
  /**
   * NEW: Create field references with shared context
   * @param {string} documentId - Document ID
   * @param {Object} formData - Extracted form data
   * @param {string} text - Document text
   * @param {Object} references - Document references
   */
  async createFieldReferencesWithSharedContext(documentId, formData, text, references) {
    // First, use the important sections if available
    const fieldContexts = this.importantSections.get(documentId);
    
    if (fieldContexts && fieldContexts instanceof Map) {
      // Create references using important sections
      if (!formData._references) {
        formData._references = {};
      }
      
      for (const [field, sectionIds] of fieldContexts.entries()) {
        if (formData[field] && !formData._references[field]) {
          // Find the best section for this field
          const bestSection = this.findBestSectionForField(field, sectionIds, references);
          
          if (bestSection) {
            formData._references[field] = {
              text: bestSection.text,
              location: bestSection.type,
              matchType: 'important-section',
              confidence: 0.9, // High confidence from extraction tracking
              sectionId: bestSection.id
            };
          }
        }
      }
    }
    
    // Then use the standard method to fill in any gaps
    await this.createFieldReferencesWithGranularSections(formData, text, references);
    
    // Add shared context findings to references
    if (this.enableSharedContext && this.sharedContextMap && this.sharedContextMap.has(documentId)) {
      const sharedContext = this.sharedContextMap.get(documentId);
      const summary = this.getSharedContextSummary(documentId);
      
      if (summary && summary.crossReferencesCount > 0) {
        console.log(`Adding ${summary.crossReferencesCount} cross-references to field references`);
        
        // Add cross-reference information to formData references
        if (!formData._sharedContext) {
          formData._sharedContext = summary;
        }
        
        // Enhance references with cross-reference data
        this.enhanceReferencesWithCrossReferences(formData, sharedContext);
      }
    }
  }
  
  /**
   * Find the best section for a field from a list of section IDs
   * @param {string} field - Field name
   * @param {Array} sectionIds - Array of section IDs
   * @param {Object} references - Document references
   * @returns {Object|null} Best section
   */
  findBestSectionForField(field, sectionIds, references) {
    if (!sectionIds || !references || !references.sections) return null;
    
    const sections = references.sections.filter(s => sectionIds.includes(s.id));
    if (sections.length === 0) return null;
    
    // Sort sections by quality and relevance
    sections.sort((a, b) => {
      // Prefer sections with embeddings
      if (a.embedding && !b.embedding) return -1;
      if (!a.embedding && b.embedding) return 1;
      
      // Prefer sections with matching types
      const relevantTypes = getRelatedSectionTypesForField(field);
      const aRelevant = relevantTypes.includes(a.typeId);
      const bRelevant = relevantTypes.includes(b.typeId);
      
      if (aRelevant && !bRelevant) return -1;
      if (!aRelevant && bRelevant) return 1;
      
      // Prefer shorter sections (more specific)
      return a.text.length - b.text.length;
    });
    
    return sections[0];
  }
  
  /**
   * Enhance references with cross-reference data
   * @param {Object} formData - Form data with references
   * @param {Object} sharedContext - Shared context object
   */
  enhanceReferencesWithCrossReferences(formData, sharedContext) {
    if (!formData._references || !sharedContext.crossReferences) return;
    
    sharedContext.crossReferences.forEach((crossRef, key) => {
      const field = crossRef.finding1.field || crossRef.finding2.field;
      
      if (field && formData._references[field]) {
        // Add cross-reference confidence boost
        const currentConfidence = formData._references[field].confidence || 0.5;
        formData._references[field].confidence = Math.min(
          currentConfidence + (crossRef.confidence * 0.1), 
          1.0
        );
        
        // Add cross-reference metadata
        if (!formData._references[field].crossReferences) {
          formData._references[field].crossReferences = [];
        }
        
        formData._references[field].crossReferences.push({
          key,
          confidence: crossRef.confidence,
          sources: [crossRef.finding1.source, crossRef.finding2.source]
        });
      }
    });
  }
  
  /**
   * NEW: Pre-analyze text for key medical sections
   * @param {string} text - Document text
   * @returns {Array} Array of key medical sections
   */
  preAnalyzeForKeyMedicalSections(text) {
    if (!text) return [];
    
    const sections = [];
    const medicalPatterns = {
      patientInfo: /(?:patient\s+name|name\s*:|\bDOB\b|date\s+of\s+birth|MRN).*$/gmi,
      diagnosis: /(?:diagnosis|assessment|impression|dx\s*:).*$/gmi,
      medications: /(?:medications?|prescription|drugs?|rx\s*:).*$/gmi,
      provider: /(?:physician|doctor|provider|attending|pcp).*$/gmi,
      labs: /(?:laboratory|lab\s+results?|test\s+results?).*$/gmi,
      discharge: /(?:discharge|disposition|follow.?up).*$/gmi
    };
    
    Object.entries(medicalPatterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match, index) => {
          // Extract a bit more context around the match
          const startIndex = Math.max(0, text.indexOf(match) - 50);
          const endIndex = Math.min(text.length, text.indexOf(match) + match.length + 100);
          const contextText = text.substring(startIndex, endIndex);
          
          sections.push({
            id: `pre-${type}-${index}`,
            text: contextText,
            type: this.getMedicalSectionType(type),
            confidence: 0.8 // Pre-analysis confidence
          });
        });
      }
    });
    
    return sections;
  }
  
  /**
   * NEW: Get medical section type from pattern name
   * @param {string} patternName - Pattern name
   * @returns {string} Section type
   */
  getMedicalSectionType(patternName) {
    const typeMap = {
      patientInfo: 'Patient Information',
      diagnosis: 'Diagnosis',
      medications: 'Medications',
      provider: 'Provider',
      labs: 'Labs',
      discharge: 'Discharge'
    };
    
    return typeMap[patternName] || 'General';
  }
  
  /**
   * NEW: Set up bidirectional context sharing
   * @param {string} documentId - Document ID
   */
  setupBidirectionalContext(documentId) {
    if (!documentId) return;
    
    // Create a shared context object that both services can access
    const sharedContext = {
      documentId,
      timestamp: new Date().toISOString(),
      ollamaTracked: [],
      embeddingMatched: [],
      crossReferences: new Map()
    };
    
    // Store shared context
    if (!this.sharedContextMap) {
      this.sharedContextMap = new Map();
    }
    this.sharedContextMap.set(documentId, sharedContext);
    
    console.log(`Bidirectional context sharing established for document ${documentId}`);
  }
  
  /**
   * NEW: Update shared context with findings from either service
   * @param {string} documentId - Document ID
   * @param {string} source - Source service ('ollama' or 'embedding')
   * @param {Object} finding - Finding to add
   */
  updateSharedContext(documentId, source, finding) {
    if (!this.sharedContextMap || !this.sharedContextMap.has(documentId)) {
      return;
    }
    
    const sharedContext = this.sharedContextMap.get(documentId);
    
    if (source === 'ollama') {
      sharedContext.ollamaTracked.push(finding);
    } else if (source === 'embedding') {
      sharedContext.embeddingMatched.push(finding);
    }
    
    // Check for cross-references between services
    this.checkCrossReferences(sharedContext, finding, source);
  }
  
  /**
   * NEW: Check for cross-references between service findings
   * @param {Object} sharedContext - Shared context object
   * @param {Object} newFinding - New finding to check
   * @param {string} source - Source of the finding
   */
  checkCrossReferences(sharedContext, newFinding, source) {
    const otherSource = source === 'ollama' ? 'embeddingMatched' : 'ollamaTracked';
    const otherFindings = sharedContext[otherSource];
    
    otherFindings.forEach(otherFinding => {
      // Check if findings refer to the same field or information
      if (this.findingsRelated(newFinding, otherFinding)) {
        const crossRefKey = `${newFinding.field || newFinding.type}_${Date.now()}`;
        sharedContext.crossReferences.set(crossRefKey, {
          finding1: { source, ...newFinding },
          finding2: { source: otherSource === 'ollamaTracked' ? 'ollama' : 'embedding', ...otherFinding },
          confidence: this.calculateCrossReferenceConfidence(newFinding, otherFinding)
        });
        
        console.log(`Cross-reference found: ${crossRefKey}`);
      }
    });
  }
  
  /**
   * NEW: Check if two findings are related
   * @param {Object} finding1 - First finding
   * @param {Object} finding2 - Second finding
   * @returns {boolean} Whether findings are related
   */
  findingsRelated(finding1, finding2) {
    // Check if they refer to the same field
    if (finding1.field && finding2.field && finding1.field === finding2.field) {
      return true;
    }
    
    // Check if they have the same type
    if (finding1.type && finding2.type && finding1.type === finding2.type) {
      return true;
    }
    
    // Check if values are similar
    if (finding1.value && finding2.value) {
      const value1 = finding1.value.toLowerCase();
      const value2 = finding2.value.toLowerCase();
      
      // Exact match or one contains the other
      if (value1 === value2 || value1.includes(value2) || value2.includes(value1)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * NEW: Calculate confidence for cross-references
   * @param {Object} finding1 - First finding
   * @param {Object} finding2 - Second finding
   * @returns {number} Confidence score
   */
  calculateCrossReferenceConfidence(finding1, finding2) {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for exact field matches
    if (finding1.field && finding2.field && finding1.field === finding2.field) {
      confidence += 0.2;
    }
    
    // Boost confidence for exact value matches
    if (finding1.value && finding2.value && finding1.value === finding2.value) {
      confidence += 0.2;
    }
    
    // Boost confidence for similar confidence scores
    if (finding1.confidence && finding2.confidence) {
      const confDiff = Math.abs(finding1.confidence - finding2.confidence);
      if (confDiff < 0.1) {
        confidence += 0.1;
      }
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * NEW: Get shared context summary
   * @param {string} documentId - Document ID
   * @returns {Object} Shared context summary
   */
  getSharedContextSummary(documentId) {
    if (!this.sharedContextMap || !this.sharedContextMap.has(documentId)) {
      return null;
    }
    
    const sharedContext = this.sharedContextMap.get(documentId);
    
    return {
      documentId,
      ollamaTrackedCount: sharedContext.ollamaTracked.length,
      embeddingMatchedCount: sharedContext.embeddingMatched.length,
      crossReferencesCount: sharedContext.crossReferences.size,
      timestamp: sharedContext.timestamp,
      crossReferences: Array.from(sharedContext.crossReferences.entries()).map(([key, value]) => ({
        key,
        ...value
      }))
    };
  }
  
  /**
   * NEW: Determine if a section is important for context sharing
   * @param {Object} section - Section to evaluate
   * @returns {boolean} Whether the section is important
   */
  isImportantSection(section) {
    if (!section || !section.text || !section.type) return false;
    
    // Section types that are typically important for medical records
    const importantTypes = [
      'Patient Information',
      'Diagnosis', 
      'Provider',
      'Medications',
      'Treatment',
      'Discharge',
      'Labs',
      'History',
      'Physical Exam',
      'Mental Status'
    ];
    
    // Check if section type is important
    if (importantTypes.includes(section.type)) {
      return true;
    }
    
    // Check for key medical terms that indicate importance
    const keyTerms = [
      'diagnosis', 'patient', 'medication', 'treatment', 'discharge',
      'prescription', 'findings', 'results', 'recommendation', 'assessment',
      'plan', 'condition', 'history', 'exam', 'therapy'
    ];
    
    const lowerText = section.text.toLowerCase();
    const containsKeyTerms = keyTerms.some(term => lowerText.includes(term));
    
    // Also check section quality and length
    const isGoodQuality = this.isHighQualitySection(section);
    const hasSubstantialContent = section.text.length > 100;
    
    return containsKeyTerms && isGoodQuality && hasSubstantialContent;
  }
}

export default PDFProcessorService;