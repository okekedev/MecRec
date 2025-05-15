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
      
      // Process document with granular sections
      this.updateProgress('processing', 0.9, 'Creating References', 'Processing document sections');
      const enhancedReferences = this.processDocumentWithGranularSections(id, extractedText);
      
      // Generate embeddings for all sections at once
      const sectionEmbeddings = [];
      try {
        if (this.useAI) {
          const testConnection = await this.ollamaService.testConnection();
          if (testConnection) {
            this.updateProgress('processing', 0.93, 'Generating Embeddings', 'Creating semantic document index');
            
            // Generate embeddings for sections to prepare for field matching
            if (enhancedReferences && enhancedReferences.sections) {
              for (const section of enhancedReferences.sections) {
                try {
                  const embedding = await this.ollamaService.generateEmbeddings(section.text);
                  sectionEmbeddings.push({
                    section,
                    embedding
                  });
                } catch (embErr) {
                  console.warn('Error generating section embedding:', embErr);
                }
              }
              console.log(`Generated embeddings for ${sectionEmbeddings.length} sections`);
            }
            
            // Ensure field references exist
            if (!formData._references) {
              formData._references = {};
            }
            
            // For each extracted field, find its source in the document
            await this.createFieldReferencesWithGranularSections(formData, extractedText, enhancedReferences, sectionEmbeddings);
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
        references: enhancedReferences,
        sectionEmbeddings: sectionEmbeddings.length // Just store the count for debugging
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
   * @param {string} documentId - Unique ID of the document
   * @param {string} documentText - Full text of the document
   * @returns {Object} Reference metadata with granular sections
   */
  processDocumentWithGranularSections(documentId, documentText) {
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
    
    for (const paragraph of paragraphs) {
      // Check if this looks like a header
      const isHeader = this.isLikelyHeader(paragraph);
      
      if (isHeader) {
        // If we had content in the current section, add it to sections
        if (currentSection.text.length > 0) {
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
   * @param {Object} formData - Extracted form data
   * @param {string} text - Full document text
   * @param {Object} references - Document references with granular sections
   * @param {Array} paragraphEmbeddings - Pre-generated paragraph embeddings
   */
  async createFieldReferencesWithGranularSections(formData, text, references, paragraphEmbeddings) {
    // Skip if no references or sections
    if (!references || !references.sections || references.sections.length === 0) {
      return;
    }
    
    // Ensure _references exists
    if (!formData._references) {
      formData._references = {};
    }
    
    console.log(`Creating field references using ${references.sections.length} granular sections`);
    
    // Generate embeddings for each section
    const sectionEmbeddings = [];
    for (const section of references.sections) {
      try {
        const embedding = await this.ollamaService.generateEmbeddings(section.text);
        sectionEmbeddings.push({
          section,
          embedding
        });
      } catch (error) {
        console.warn(`Error generating embedding for section: ${error.message}`);
      }
    }
    
    console.log(`Generated embeddings for ${sectionEmbeddings.length} sections`);
    
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
        let foundRef = false;
        
        // 1. First check for exact matches in specific section types
        // Map fields to their likely section types
        const fieldTypeMappings = {
          'patientName': ['Patient Name', 'Patient Information', 'Demographics'],
          'patientDOB': ['Date of Birth', 'Patient Information', 'Demographics'],
          'insurance': ['Insurance', 'Financial', 'Coverage'],
          'location': ['Location', 'Facility', 'Hospital'],
          'dx': ['Diagnosis', 'Assessment', 'Impression'],
          'pcp': ['Provider', 'Physician', 'Doctor', 'PCP'],
          'dc': ['Discharge', 'Disposition'],
          'wounds': ['Physical Exam', 'Assessment', 'Wounds'],
          'antibiotics': ['Medications', 'Antibiotics', 'Treatment'],
          'cardiacDrips': ['Medications', 'Cardiac', 'Treatment'],
          'labs': ['Laboratory', 'Labs', 'Results'],
          'faceToFace': ['Encounter', 'Visit', 'Face to Face'],
          'history': ['History', 'Past Medical History', 'Medical History'],
          'mentalHealthState': ['Mental Health', 'Psychological', 'Psychiatric'],
          'additionalComments': ['Comments', 'Notes', 'Additional']
        };
        
        // Get the relevant section types for this field
        const relevantTypes = fieldTypeMappings[field] || [];
        
        // First look for exact value matches in sections of relevant types
        const typedExactMatches = references.sections.filter(section => {
          // Check if section type matches and contains the exact value
          return (
            relevantTypes.some(type => section.type.toLowerCase().includes(type.toLowerCase())) &&
            section.text.includes(value)
          );
        });
        
        if (typedExactMatches.length > 0) {
          // Sort by text length (shorter is more specific)
          typedExactMatches.sort((a, b) => a.text.length - b.text.length);
          
          // Use the most specific (shortest) match
          formData._references[field] = {
            text: typedExactMatches[0].text,
            location: typedExactMatches[0].type,
            matchType: 'exact-typed'
          };
          foundRef = true;
        }
        
        // 2. If no typed exact match, try exact match in any section
        if (!foundRef) {
          const exactMatches = references.sections.filter(section => section.text.includes(value));
          
          if (exactMatches.length > 0) {
            // Sort by text length (shorter is more specific)
            exactMatches.sort((a, b) => a.text.length - b.text.length);
            
            // Use the most specific (shortest) match
            formData._references[field] = {
              text: exactMatches[0].text,
              location: exactMatches[0].type,
              matchType: 'exact'
            };
            foundRef = true;
          }
        }
        
        // 3. If no exact match, try semantic search with pre-generated embeddings
        if (!foundRef && value.length > 3 && sectionEmbeddings.length > 0) {
          // Generate embedding for the field value
          const fieldEmbedding = await this.ollamaService.generateEmbeddings(value);
          
          // Score all sections by similarity
          const scoredSections = sectionEmbeddings.map(se => ({
            section: se.section,
            score: this.ollamaService.cosineSimilarity(fieldEmbedding, se.embedding)
          }));
          
          // Sort by similarity score
          scoredSections.sort((a, b) => b.score - a.score);
          
          // If we have relevant types, prioritize sections of those types
          const typedScoredSections = scoredSections.filter(ss => 
            relevantTypes.some(type => ss.section.type.toLowerCase().includes(type.toLowerCase()))
          );
          
          // Use type-specific match if good score, otherwise use best overall match
          if (typedScoredSections.length > 0 && typedScoredSections[0].score > 0.35) {
            // Use best match of relevant type
            formData._references[field] = {
              text: typedScoredSections[0].section.text,
              location: typedScoredSections[0].section.type,
              matchType: 'semantic-typed',
              score: typedScoredSections[0].score
            };
            foundRef = true;
          } else if (scoredSections.length > 0 && scoredSections[0].score > 0.35) {
            // Use best overall match
            formData._references[field] = {
              text: scoredSections[0].section.text,
              location: scoredSections[0].section.type,
              matchType: 'semantic',
              score: scoredSections[0].score
            };
            foundRef = true;
          }
        }
        
        // 4. If still no match, try keyword matching with more advanced techniques
        if (!foundRef) {
          // Extract significant keywords from the field value
          const keywords = this.extractSignificantKeywords(value);
          
          if (keywords.length > 0) {
            // Score sections by keyword matches
            const keywordMatches = [];
            
            for (const section of references.sections) {
              const sectionText = section.text.toLowerCase();
              let matchCount = 0;
              let weightedScore = 0;
              
              // Calculate weighted score based on keyword importance
              for (const keyword of keywords) {
                if (sectionText.includes(keyword.term.toLowerCase())) {
                  matchCount++;
                  weightedScore += keyword.weight;
                }
              }
              
              if (matchCount > 0) {
                keywordMatches.push({
                  section,
                  matchCount,
                  weightedScore,
                  relevantType: relevantTypes.some(type => 
                    section.type.toLowerCase().includes(type.toLowerCase())
                  ),
                  score: weightedScore / keywords.reduce((sum, k) => sum + k.weight, 0)
                });
              }
            }
            
            // First try with relevant types
            const typedKeywordMatches = keywordMatches.filter(km => km.relevantType);
            
            // Sort by weighted score
            keywordMatches.sort((a, b) => b.weightedScore - a.weightedScore);
            typedKeywordMatches.sort((a, b) => b.weightedScore - a.weightedScore);
            
            // Use best match (prioritize typed matches)
            if (typedKeywordMatches.length > 0) {
              formData._references[field] = {
                text: typedKeywordMatches[0].section.text,
                location: typedKeywordMatches[0].section.type,
                matchType: 'keyword-typed',
                score: typedKeywordMatches[0].score
              };
              foundRef = true;
            } else if (keywordMatches.length > 0) {
              formData._references[field] = {
                text: keywordMatches[0].section.text,
                location: keywordMatches[0].section.type,
                matchType: 'keyword',
                score: keywordMatches[0].score
              };
              foundRef = true;
            }
          }
        }
        
        // 5. If we found a reference with a very long text, try to extract just the relevant part
        if (foundRef && formData._references[field] && formData._references[field].text.length > 200) {
          const shortenedText = this.extractRelevantTextSnippet(
            formData._references[field].text, 
            value,
            100 // Context size before and after the match
          );
          
          if (shortenedText && shortenedText.length < formData._references[field].text.length) {
            // Update with the shorter, more focused text
            formData._references[field].text = shortenedText;
            formData._references[field].isSnippet = true;
          }
        }
      } catch (error) {
        console.warn(`Error finding granular reference for field ${field}:`, error);
      }
    }
    
    console.log(`Created granular references for ${Object.keys(formData._references).length} fields`);
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
   * Extract a relevant text snippet around a value
   * @param {string} fullText - Full text to extract from
   * @param {string} value - Value to find
   * @param {number} contextSize - Characters of context before and after
   * @returns {string} Extracted snippet
   */
  extractRelevantTextSnippet(fullText, value, contextSize = 100) {
    if (!fullText || !value) return fullText;
    
    // Find the position of the value in the text
    const index = fullText.indexOf(value);
    
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