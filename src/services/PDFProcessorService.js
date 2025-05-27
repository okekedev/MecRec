// Enhanced PDFProcessorService with improved embeddings tracking and updated field mappings
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
   * Enhanced with improved embeddings tracking
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
      
      // Initialize default formData structure with updated field names
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
        medications: '', // Updated from 'antibiotics'
        cardiacDrips: '',
        labsAndVitals: '', // Updated from 'labs' 
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
      
      // Enhanced embeddings generation with detailed tracking
      const paragraphEmbeddings = [];
      try {
        if (this.useAI) {
          const testConnection = await this.ollamaService.testConnection();
          if (testConnection) {
            this.updateProgress('processing', 0.93, 'Generating Embeddings', 'Creating semantic document index');
            
            // Generate embeddings for each paragraph to prepare for field matching
            if (references && references.paragraphs) {
              for (let i = 0; i < references.paragraphs.length; i++) {
                const paragraph = references.paragraphs[i];
                try {
                  const embedding = await this.ollamaService.generateEmbeddings(paragraph.text);
                  paragraphEmbeddings.push({
                    paragraph,
                    embedding,
                    index: i,
                    // Add metadata for better tracking
                    pageNumber: this.extractPageNumber(paragraph.text),
                    sectionType: paragraph.type,
                    textLength: paragraph.text.length
                  });
                } catch (embErr) {
                  console.warn(`Error generating paragraph embedding for index ${i}:`, embErr);
                }
              }
              console.log(`Generated embeddings for ${paragraphEmbeddings.length} paragraphs`);
            }
            
            // Ensure field references exist
            if (!formData._references) {
              formData._references = {};
            }
            
            // For each extracted field, find its source in the document with enhanced tracking
            await this.createEnhancedFieldReferences(formData, extractedText, references, paragraphEmbeddings);
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
   * Extract page number from paragraph text (if available)
   */
  extractPageNumber(text) {
    // Look for page markers like "--- Page 1 ---"
    const pageMatch = text.match(/---\s*Page\s+(\d+)\s*---/i);
    if (pageMatch) {
      return parseInt(pageMatch[1], 10);
    }
    return null;
  }
  
  /**
   * Enhanced field reference creation with improved embeddings tracking
   * This method focuses on finding the exact sections where AI referenced information
   * @param {Object} formData - Extracted form data
   * @param {string} text - Full document text
   * @param {Object} references - Document references
   * @param {Array} paragraphEmbeddings - Pre-generated paragraph embeddings with metadata
   */
  async createEnhancedFieldReferences(formData, text, references, paragraphEmbeddings) {
    // Skip if no references or paragraph embeddings
    if (!references || !references.paragraphs || !paragraphEmbeddings || paragraphEmbeddings.length === 0) {
      return;
    }
    
    // Ensure _references exists
    if (!formData._references) {
      formData._references = {};
    }
    
    console.log("Creating enhanced field references with detailed embeddings tracking");
    
    // For each field with content, try to find its exact source using multiple strategies
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
        console.log(`\n--- Finding references for field: ${field} ---`);
        console.log(`Field value: "${value}"`);
        
        // Strategy 1: Exact substring matching (highest confidence)
        let bestMatch = this.findExactMatch(value, paragraphEmbeddings);
        
        // Strategy 2: If no exact match, try keyword matching
        if (!bestMatch) {
          bestMatch = this.findKeywordMatch(value, paragraphEmbeddings);
        }
        
        // Strategy 3: If still no match, use semantic similarity with embeddings
        if (!bestMatch && value.length > 3) {
          bestMatch = await this.findSemanticMatch(value, paragraphEmbeddings);
        }
        
        // Strategy 4: Field-specific contextual matching
        if (!bestMatch) {
          bestMatch = this.findContextualMatch(field, value, paragraphEmbeddings);
        }
        
        // Store the best match found
        if (bestMatch) {
          formData._references[field] = {
            text: bestMatch.paragraph.text,
            location: bestMatch.paragraph.type,
            matchType: bestMatch.matchType,
            confidence: bestMatch.confidence || 0,
            score: bestMatch.score || 0,
            paragraphIndex: bestMatch.index,
            pageNumber: bestMatch.pageNumber,
            // Enhanced tracking information
            extractedValue: value,
            matchedSegment: bestMatch.matchedSegment || '',
            searchStrategies: bestMatch.searchStrategies || [],
            timestamp: new Date().toISOString()
          };
          
          console.log(`✓ Found reference for ${field}: ${bestMatch.matchType} match (confidence: ${bestMatch.confidence})`);
          if (bestMatch.matchedSegment) {
            console.log(`  Matched segment: "${bestMatch.matchedSegment}"`);
          }
        } else {
          console.log(`✗ No reference found for ${field}`);
          
          // Store that we searched but found nothing
          formData._references[field] = {
            text: '',
            location: 'Not found',
            matchType: 'none',
            confidence: 0,
            extractedValue: value,
            searchStrategies: ['exact', 'keyword', 'semantic', 'contextual'],
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        console.warn(`Error finding reference for field ${field}:`, error);
      }
    }
    
    console.log(`\nCreated enhanced references for ${Object.keys(formData._references).length} fields`);
  }
  
  /**
   * Find exact substring matches
   */
  findExactMatch(value, paragraphEmbeddings) {
    console.log(`  Strategy 1: Looking for exact match of "${value}"`);
    
    for (const pe of paragraphEmbeddings) {
      const paragraph = pe.paragraph;
      const lowerText = paragraph.text.toLowerCase();
      const lowerValue = value.toLowerCase();
      
      if (lowerText.includes(lowerValue)) {
        // Find the exact position and context
        const startIndex = lowerText.indexOf(lowerValue);
        const endIndex = startIndex + lowerValue.length;
        
        // Get some context around the match
        const contextStart = Math.max(0, startIndex - 50);
        const contextEnd = Math.min(paragraph.text.length, endIndex + 50);
        const matchedSegment = paragraph.text.substring(contextStart, contextEnd);
        
        console.log(`    Found exact match in paragraph ${pe.index}`);
        
        return {
          ...pe,
          matchType: 'exact',
          confidence: 1.0,
          matchedSegment,
          searchStrategies: ['exact']
        };
      }
    }
    
    console.log(`    No exact match found`);
    return null;
  }
  
  /**
   * Find matches based on keywords
   */
  findKeywordMatch(value, paragraphEmbeddings) {
    console.log(`  Strategy 2: Looking for keyword matches`);
    
    // Extract meaningful keywords from the value
    const keywords = this.extractKeywords(value);
    if (keywords.length === 0) {
      console.log(`    No meaningful keywords found in "${value}"`);
      return null;
    }
    
    console.log(`    Keywords: ${keywords.join(', ')}`);
    
    const keywordMatches = [];
    
    for (const pe of paragraphEmbeddings) {
      const paragraph = pe.paragraph;
      const lowerText = paragraph.text.toLowerCase();
      let matchCount = 0;
      let matchedKeywords = [];
      let matchedSegments = [];
      
      // Count matching keywords and find their positions
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matchCount++;
          matchedKeywords.push(keyword);
          
          // Find the context around this keyword
          const keywordIndex = lowerText.indexOf(keyword.toLowerCase());
          const contextStart = Math.max(0, keywordIndex - 30);
          const contextEnd = Math.min(paragraph.text.length, keywordIndex + keyword.length + 30);
          matchedSegments.push(paragraph.text.substring(contextStart, contextEnd));
        }
      }
      
      if (matchCount > 0) {
        const score = matchCount / keywords.length;
        keywordMatches.push({
          ...pe,
          matchCount,
          score,
          matchedKeywords,
          matchedSegments: matchedSegments.join(' ... ')
        });
      }
    }
    
    if (keywordMatches.length > 0) {
      // Sort by match count, then by score
      keywordMatches.sort((a, b) => {
        if (a.matchCount !== b.matchCount) {
          return b.matchCount - a.matchCount;
        }
        return b.score - a.score;
      });
      
      const bestMatch = keywordMatches[0];
      console.log(`    Best keyword match: ${bestMatch.matchCount}/${keywords.length} keywords in paragraph ${bestMatch.index}`);
      
      return {
        ...bestMatch,
        matchType: 'keyword',
        confidence: bestMatch.score,
        matchedSegment: bestMatch.matchedSegments,
        searchStrategies: ['exact', 'keyword']
      };
    }
    
    console.log(`    No keyword matches found`);
    return null;
  }
  
  /**
   * Find semantic matches using embeddings
   */
  async findSemanticMatch(value, paragraphEmbeddings) {
    console.log(`  Strategy 3: Looking for semantic matches using embeddings`);
    
    try {
      // Generate embedding for the field value
      const fieldEmbedding = await this.ollamaService.generateEmbeddings(value);
      
      // Calculate similarity with each paragraph embedding
      const similarities = paragraphEmbeddings.map(pe => ({
        ...pe,
        score: this.ollamaService.cosineSimilarity(fieldEmbedding, pe.embedding)
      }));
      
      // Sort by similarity score
      similarities.sort((a, b) => b.score - a.score);
      
      const bestMatch = similarities[0];
      
      // Only use semantic matches with a reasonable threshold
      const SEMANTIC_THRESHOLD = 0.3;
      if (bestMatch.score > SEMANTIC_THRESHOLD) {
        console.log(`    Best semantic match: score ${bestMatch.score.toFixed(3)} in paragraph ${bestMatch.index}`);
        
        // Try to find what part of the paragraph is most relevant
        const relevantSegment = this.findMostRelevantSegment(value, bestMatch.paragraph.text);
        
        return {
          ...bestMatch,
          matchType: 'semantic',
          confidence: bestMatch.score,
          matchedSegment: relevantSegment,
          searchStrategies: ['exact', 'keyword', 'semantic']
        };
      } else {
        console.log(`    Best semantic score ${bestMatch.score.toFixed(3)} below threshold ${SEMANTIC_THRESHOLD}`);
      }
    } catch (error) {
      console.warn(`    Semantic matching failed:`, error);
    }
    
    return null;
  }
  
  /**
   * Find contextual matches based on field type and medical context
   */
  findContextualMatch(field, value, paragraphEmbeddings) {
    console.log(`  Strategy 4: Looking for contextual matches for field type "${field}"`);
    
    // Define field-specific context keywords
    const fieldContexts = {
      patientName: ['patient', 'name', 'pt', 'client'],
      patientDOB: ['dob', 'date of birth', 'born', 'birth date', 'age'],
      insurance: ['insurance', 'coverage', 'plan', 'policy', 'aetna', 'medicare', 'medicaid', 'bcbs'],
      location: ['hospital', 'facility', 'clinic', 'center', 'unit', 'room', 'floor'],
      dx: ['diagnosis', 'dx', 'condition', 'disease', 'disorder', 'icd'],
      pcp: ['pcp', 'primary care', 'physician', 'doctor', 'provider', 'md', 'do'],
      dc: ['discharge', 'dc', 'released', 'discharged', 'home', 'facility'],
      wounds: ['wound', 'laceration', 'cut', 'injury', 'sore', 'ulcer', 'healing'],
      medications: ['medication', 'medicine', 'drug', 'antibiotic', 'rx', 'prescription', 'pill', 'tablet'],
      cardiacDrips: ['cardiac', 'drip', 'heart', 'cardio', 'iv', 'infusion', 'dopamine', 'dobutamine'],
      labsAndVitals: ['lab', 'laboratory', 'test', 'result', 'vital', 'bp', 'blood pressure', 'temperature', 'pulse', 'o2', 'oxygen'],
      faceToFace: ['face to face', 'f2f', 'visit', 'seen', 'evaluated', 'examined'],
      history: ['history', 'hx', 'past', 'previous', 'prior', 'background'],
      mentalHealthState: ['mental', 'psych', 'mood', 'depression', 'anxiety', 'cognitive', 'alert'],
      additionalComments: ['notes', 'comments', 'remarks', 'additional', 'other', 'misc']
    };
    
    const contextKeywords = fieldContexts[field] || [];
    if (contextKeywords.length === 0) {
      console.log(`    No context keywords defined for field "${field}"`);
      return null;
    }
    
    console.log(`    Context keywords for ${field}: ${contextKeywords.join(', ')}`);
    
    const contextMatches = [];
    
    for (const pe of paragraphEmbeddings) {
      const paragraph = pe.paragraph;
      const lowerText = paragraph.text.toLowerCase();
      let contextScore = 0;
      let matchedContexts = [];
      
      // Check for context keywords
      for (const contextKeyword of contextKeywords) {
        if (lowerText.includes(contextKeyword.toLowerCase())) {
          contextScore++;
          matchedContexts.push(contextKeyword);
        }
      }
      
      // Also check if the extracted value appears in this paragraph
      const valueInParagraph = lowerText.includes(value.toLowerCase());
      
      if (contextScore > 0) {
        contextMatches.push({
          ...pe,
          contextScore,
          matchedContexts,
          valueInParagraph,
          // Boost score if value is also in paragraph
          totalScore: contextScore + (valueInParagraph ? 2 : 0)
        });
      }
    }
    
    if (contextMatches.length > 0) {
      // Sort by total score
      contextMatches.sort((a, b) => b.totalScore - a.totalScore);
      
      const bestMatch = contextMatches[0];
      console.log(`    Best contextual match: ${bestMatch.contextScore} context keywords + ${bestMatch.valueInParagraph ? 'value present' : 'value not present'} in paragraph ${bestMatch.index}`);
      
      // Find the most relevant segment
      let relevantSegment = '';
      if (bestMatch.valueInParagraph) {
        relevantSegment = this.findMostRelevantSegment(value, bestMatch.paragraph.text);
      } else {
        // Find segment containing context keywords
        const lowerText = bestMatch.paragraph.text.toLowerCase();
        for (const context of bestMatch.matchedContexts) {
          const contextIndex = lowerText.indexOf(context.toLowerCase());
          if (contextIndex !== -1) {
            const start = Math.max(0, contextIndex - 40);
            const end = Math.min(bestMatch.paragraph.text.length, contextIndex + context.length + 40);
            relevantSegment = bestMatch.paragraph.text.substring(start, end);
            break;
          }
        }
      }
      
      return {
        ...bestMatch,
        matchType: 'contextual',
        confidence: Math.min(bestMatch.totalScore / 3, 1.0), // Normalize confidence
        matchedSegment: relevantSegment,
        searchStrategies: ['exact', 'keyword', 'semantic', 'contextual']
      };
    }
    
    console.log(`    No contextual matches found`);
    return null;
  }
  
  /**
   * Extract meaningful keywords from a value
   */
  extractKeywords(value) {
    // Split by spaces and filter out common words
    const stopWords = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 
                              'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 
                              'to', 'was', 'were', 'will', 'with', 'have', 'this', 'not', 'but']);
    
    return value.toLowerCase()
      .split(/[\s,.-]+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter(word => /^[a-zA-Z0-9]+$/.test(word)); // Only alphanumeric words
  }
  
  /**
   * Find the most relevant segment of text for a given value
   */
  findMostRelevantSegment(value, text, contextSize = 60) {
    const lowerText = text.toLowerCase();
    const lowerValue = value.toLowerCase();
    
    // Try to find the value in the text
    const valueIndex = lowerText.indexOf(lowerValue);
    
    if (valueIndex !== -1) {
      // Found the value, get context around it
      const start = Math.max(0, valueIndex - contextSize);
      const end = Math.min(text.length, valueIndex + value.length + contextSize);
      return text.substring(start, end);
    }
    
    // If value not found exactly, try to find keywords
    const keywords = this.extractKeywords(value);
    for (const keyword of keywords) {
      const keywordIndex = lowerText.indexOf(keyword.toLowerCase());
      if (keywordIndex !== -1) {
        const start = Math.max(0, keywordIndex - contextSize);
        const end = Math.min(text.length, keywordIndex + keyword.length + contextSize);
        return text.substring(start, end);
      }
    }
    
    // Fallback: return first part of the paragraph
    return text.length > contextSize * 2 ? text.substring(0, contextSize * 2) + '...' : text;
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
   * Enhanced with detailed embeddings tracking
   * @param {string} documentId - Document ID
   * @param {string} fieldName - Field name
   * @returns {Object|null} Enhanced field reference with detailed tracking
   */
  getFieldReference(documentId, fieldName) {
    const document = this.documentsCache.get(documentId);
    if (document && document.formData) {
      // Look for enhanced reference information first
      if (document.formData._references && document.formData._references[fieldName]) {
        const reference = document.formData._references[fieldName];
        
        // Return enhanced reference with all tracking information
        return {
          text: reference.text,
          location: reference.location,
          matchType: reference.matchType,
          confidence: reference.confidence,
          score: reference.score,
          paragraphIndex: reference.paragraphIndex,
          pageNumber: reference.pageNumber,
          extractedValue: reference.extractedValue,
          matchedSegment: reference.matchedSegment,
          searchStrategies: reference.searchStrategies,
          timestamp: reference.timestamp
        };
      }
      
      // Fall back to looking in document references (legacy support)
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
              location: matchingParagraph.type,
              matchType: 'legacy',
              confidence: 0.5,
              extractedValue: fieldValue
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