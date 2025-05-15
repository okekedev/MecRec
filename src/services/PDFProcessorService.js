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
      if (extractedText && this.useAI) {
        try {
          console.log(`Using AI to extract information from ${extractedText.length} characters of text (${extractionResult.pages} pages)`);
          this.updateProgress('processing', 0.35, 'AI Extraction', 'Starting AI information extraction');
          
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
      
      // Process document with granular sections
      this.updateProgress('processing', 0.9, 'Creating References', 'Processing document sections');
      const enhancedReferences = await this.processDocumentWithGranularSections(id, extractedText);
      
      // Create field references to match extracted data to document sections
      await this.createFieldReferencesWithGranularSections(formData, extractedText, enhancedReferences);
      
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
        references: enhancedReferences,
        sectionEmbeddings: enhancedReferences.sections.filter(s => s.embedding).length // Just store the count for debugging
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
    
    // Generate embeddings for all sections
    try {
      // Make sure embedding service is initialized
      await this.embeddingService.initialize();
      
      // Update progress
      this.updateProgress('processing', 0.92, 'Generating Embeddings', 'Creating semantic document index');
      
      // Process sections in batches to avoid memory issues
      const BATCH_SIZE = 10;
      for (let i = 0; i < referenceData.sections.length; i += BATCH_SIZE) {
        const batch = referenceData.sections.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel
        await Promise.all(batch.map(async (section) => {
          try {
            section.embedding = await this.embeddingService.getEmbedding(section.text);
          } catch (error) {
            console.warn(`Error generating embedding for section ${section.id}:`, error);
            // Continue without embeddings for this section
          }
        }));
        
        // Update progress
        const progress = 0.92 + (0.08 * (Math.min(i + BATCH_SIZE, referenceData.sections.length) / referenceData.sections.length));
        this.updateProgress('processing', progress, 'Generating Embeddings', `Processed ${Math.min(i + BATCH_SIZE, referenceData.sections.length)} of ${referenceData.sections.length} sections`);
      }
      
      console.log(`Generated embeddings for ${referenceData.sections.filter(s => s.embedding).length} sections`);
    } catch (error) {
      console.warn('Error generating section embeddings:', error);
      // Continue without embeddings
    }
    
    return referenceData;
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
        
        // Use the new enhanced context finder
        const matchResults = await this.embeddingService.findContextForField(
          value, 
          sectionsToUse, 
          field, 
          relevantTypeIds
        );
        
        if (matchResults && matchResults.length > 0) {
          // Get the best match
          const bestMatch = matchResults[0];
          
          // Extract enhanced context for better human readability
          const coherentContext = this.extractCoherentContext(
            bestMatch.section.text, 
            value
          );
          
          // Create the enhanced field reference
          formData._references[field] = {
            text: coherentContext,
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
          // Fall back to traditional semantic search if enhanced matching fails
          const similarSections = await this.embeddingService.findRelevantSections(
            value,
            sectionsToUse,
            3 // Find top 3 matches
          );
          
          if (similarSections.length > 0) {
            // Use the best match from semantic search
            const bestMatch = similarSections[0];
            formData._references[field] = {
              text: this.extractCoherentContext(bestMatch.item.text, value),
              location: bestMatch.item.type || SectionType.getName(bestMatch.item.typeId || 0),
              matchType: 'semantic',
              score: bestMatch.score,
              explanation: this.generateFieldExtractionExplanation(field, value, {
                confidence: bestMatch.score,
                sectionType: bestMatch.item.type || SectionType.getName(bestMatch.item.typeId || 0)
              })
            };
          } else {
            // Final fallback: exact text matching
            this.findExactTextMatch(field, value, references, formData);
            
            // Add explanation if we found an exact match
            if (formData._references[field]) {
              formData._references[field].explanation = `This ${field} information was found by exact text matching.`;
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
}

export default PDFProcessorService;