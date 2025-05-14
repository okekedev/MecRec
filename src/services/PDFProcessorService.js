// PDFProcessorService with proper text extraction
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
      
      // Extract the text from the extraction result
      const extractedText = extractionResult.text || '';
      
      // Initialize formData with default empty values
      let formData = {
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
      
      // Try to extract form data using AI if enabled
      if (this.useAI && extractedText) {
        try {
          console.log('Attempting to extract information using AI...');
          const testConnection = await this.ollamaService.testConnection();
          
          if (testConnection) {
            // Extract information using Ollama
            const extractedInfo = await this.ollamaService.extractInformation(extractedText);
            
            if (extractedInfo && extractedInfo.extractionMethod !== 'failed') {
              console.log('AI extraction successful');
              // Merge the AI-extracted information with our formData
              formData = { ...formData, ...extractedInfo };
            } else {
              console.log('AI extraction failed, using fallback parser');
              // Use fallback extraction
              formData = this.fallbackTextExtraction(extractedText, formData);
            }
          } else {
            console.log('Ollama service not available, using fallback parser');
            // Use fallback extraction
            formData = this.fallbackTextExtraction(extractedText, formData);
          }
        } catch (error) {
          console.error('Error in AI extraction:', error);
          // Use fallback extraction
          formData = this.fallbackTextExtraction(extractedText, formData);
        }
      } else {
        console.log('AI extraction disabled, using fallback parser');
        // Use fallback extraction
        formData = this.fallbackTextExtraction(extractedText, formData);
      }
      
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
   * Fallback text extraction method when AI is not available
   * Uses simple pattern matching to extract information from text
   * @param {string} text - Document text
   * @param {Object} formData - Initial form data object
   * @returns {Object} Updated form data
   */
  fallbackTextExtraction(text, formData) {
    console.log('Using fallback text extraction...');
    const lines = text.split('\n');
    
    // Create an empty result object
    const result = { ...formData };
    
    // Convert text to lowercase for case-insensitive matching
    const lowerText = text.toLowerCase();
    
    // Extract insurance information
    if (lowerText.includes('insurance') || lowerText.includes('insurer') || lowerText.includes('policy')) {
      const insurancePattern = /(?:insurance|insurer|policy)(?:\s*provider|\s*company)?[\s:]*([A-Za-z0-9\s&,.']+)(?:[\r\n]|policy|ID)/i;
      const insuranceMatch = text.match(insurancePattern);
      
      if (insuranceMatch && insuranceMatch[1]) {
        result.insurance = insuranceMatch[1].trim();
      } else {
        // Try to find text near insurance keywords
        const insuranceKeywords = ['insurance', 'insurer', 'policy', 'coverage'];
        result.insurance = this.findTextNearKeywords(text, insuranceKeywords, 3);
      }
    }
    
    // Extract location information
    if (lowerText.includes('location') || lowerText.includes('facility') || lowerText.includes('hospital') || lowerText.includes('clinic')) {
      const locationPattern = /(?:location|facility|hospital|clinic)[\s:]*([A-Za-z0-9\s&,.']+)(?:[\r\n]|address|phone)/i;
      const locationMatch = text.match(locationPattern);
      
      if (locationMatch && locationMatch[1]) {
        result.location = locationMatch[1].trim();
      } else {
        // Try to find text near location keywords
        const locationKeywords = ['location', 'facility', 'hospital', 'clinic', 'center', 'department'];
        result.location = this.findTextNearKeywords(text, locationKeywords, 3);
      }
    }
    
    // Extract diagnosis (dx) information
    if (lowerText.includes('diagnosis') || lowerText.includes('dx') || lowerText.includes('assessment')) {
      const dxPattern = /(?:diagnosis|dx|assessment|impression)(?:\s*primary|\s*principal)?[\s:]*([A-Za-z0-9\s&,.()\-'\/]+)(?:[\r\n]|secondary|plan|treatment)/i;
      const dxMatch = text.match(dxPattern);
      
      if (dxMatch && dxMatch[1]) {
        result.dx = dxMatch[1].trim();
      } else {
        // Try to find text near diagnosis keywords
        const dxKeywords = ['diagnosis', 'dx', 'assessment', 'impression', 'condition'];
        result.dx = this.findTextNearKeywords(text, dxKeywords, 4);
      }
    }
    
    // Extract primary care provider (PCP) information
    if (lowerText.includes('primary care') || lowerText.includes('pcp') || lowerText.includes('provider') || lowerText.includes('physician')) {
      const pcpPattern = /(?:primary care provider|primary care physician|pcp|attending physician|provider)[\s:]*(?:name|is)?[\s:]*([A-Za-z\s.,\-']+)(?:[\r\n]|md|do)/i;
      const pcpMatch = text.match(pcpPattern);
      
      if (pcpMatch && pcpMatch[1]) {
        result.pcp = pcpMatch[1].trim();
      } else {
        // Try to find a name pattern
        const namePattern = /(?:dr\.?|doctor|physician|provider)[\s:]*([A-Za-z\s.,\-']+)(?:[\r\n]|md|do)/i;
        const nameMatch = text.match(namePattern);
        
        if (nameMatch && nameMatch[1]) {
          result.pcp = nameMatch[1].trim();
        } else {
          // Try to find text near PCP keywords
          const pcpKeywords = ['primary care', 'pcp', 'provider', 'physician', 'doctor'];
          result.pcp = this.findTextNearKeywords(text, pcpKeywords, 3);
        }
      }
    }
    
    // Extract discharge (DC) information
    if (lowerText.includes('discharge') || lowerText.includes('dc ') || lowerText.includes('disposition')) {
      const dcPattern = /(?:discharge|dc|disposition)(?:\s*summary|\s*plan|\s*date)?[\s:]*([A-Za-z0-9\s&,.()\-'\/]+)(?:[\r\n]|follow|instructions)/i;
      const dcMatch = text.match(dcPattern);
      
      if (dcMatch && dcMatch[1]) {
        result.dc = dcMatch[1].trim();
      } else {
        // Try to find text near DC keywords
        const dcKeywords = ['discharge', 'dc ', 'disposition', 'released'];
        result.dc = this.findTextNearKeywords(text, dcKeywords, 4);
      }
    }
    
    // Extract wound information
    if (lowerText.includes('wound') || lowerText.includes('laceration') || lowerText.includes('incision')) {
      const woundPattern = /(?:wound|laceration|incision)(?:\s*care|\s*assessment|\s*status)?[\s:]*([A-Za-z0-9\s&,.()\-'\/]+)(?:[\r\n]|dressing|treatment)/i;
      const woundMatch = text.match(woundPattern);
      
      if (woundMatch && woundMatch[1]) {
        result.wounds = woundMatch[1].trim();
      } else {
        // Try to find paragraphs containing wound keywords
        const woundKeywords = ['wound', 'laceration', 'incision', 'ulcer', 'suture'];
        result.wounds = this.findParagraphsWithKeywords(text, woundKeywords);
      }
    }
    
    // Extract antibiotics information
    if (lowerText.includes('antibiotic') || lowerText.includes('antimicrobial') || lowerText.includes('abx')) {
      const antibioticPattern = /(?:antibiotic|antimicrobial|abx)(?:\s*therapy|\s*treatment|\s*medication)?[\s:]*([A-Za-z0-9\s&,.()\-'\/]+)(?:[\r\n]|dose|duration)/i;
      const antibioticMatch = text.match(antibioticPattern);
      
      if (antibioticMatch && antibioticMatch[1]) {
        result.antibiotics = antibioticMatch[1].trim();
      } else {
        // Look for common antibiotics
        const antibioticNames = ['penicillin', 'amoxicillin', 'augmentin', 'cephalexin', 'cefazolin', 'azithromycin', 'doxycycline', 'clindamycin', 'vancomycin', 'ciprofloxacin', 'levofloxacin', 'bactrim', 'metronidazole', 'ceftriaxone'];
        
        const foundAntibiotics = antibioticNames.filter(name => lowerText.includes(name));
        
        if (foundAntibiotics.length > 0) {
          result.antibiotics = foundAntibiotics.join(', ');
        } else {
          // Try to find paragraphs containing antibiotic keywords
          const antibioticKeywords = ['antibiotic', 'antimicrobial', 'abx', 'infection', 'bacterial'];
          result.antibiotics = this.findParagraphsWithKeywords(text, antibioticKeywords);
        }
      }
    }
    
    // Extract cardiac drip information
    if (lowerText.includes('cardiac') || lowerText.includes('drip') || lowerText.includes('infusion')) {
      const cardiacPattern = /(?:cardiac|drip|infusion|iv)(?:\s*medication|\s*therapy)?[\s:]*([A-Za-z0-9\s&,.()\-'\/]+)(?:[\r\n]|rate|dose)/i;
      const cardiacMatch = text.match(cardiacPattern);
      
      if (cardiacMatch && cardiacMatch[1]) {
        result.cardiacDrips = cardiacMatch[1].trim();
      } else {
        // Look for common cardiac drips
        const dripNames = ['norepinephrine', 'epinephrine', 'dopamine', 'dobutamine', 'vasopressin', 'nitroglycerin', 'nitroprusside', 'milrinone', 'amiodarone', 'lidocaine', 'nicardipine', 'esmolol', 'labetalol'];
        
        const foundDrips = dripNames.filter(name => lowerText.includes(name));
        
        if (foundDrips.length > 0) {
          result.cardiacDrips = foundDrips.join(', ');
        } else {
          // Try to find paragraphs containing cardiac drip keywords
          const dripKeywords = ['infusion', 'drip', 'cardiac medication', 'iv medication'];
          result.cardiacDrips = this.findParagraphsWithKeywords(text, dripKeywords);
        }
      }
    }
    
    // Extract lab results
    if (lowerText.includes('lab') || lowerText.includes('laboratory') || lowerText.includes('test result')) {
      // For labs, try to find a paragraph with lab information
      const labKeywords = ['lab', 'laboratory', 'test result', 'cbc', 'bmp', 'cmp', 'wbc', 'hgb', 'plt', 'sodium', 'potassium', 'creatinine', 'glucose', 'bun'];
      const labInfo = this.findParagraphsWithKeywords(text, labKeywords);
      
      if (labInfo) {
        result.labs = labInfo;
      }
    }
    
    // Extract face to face information
    if (lowerText.includes('face to face') || lowerText.includes('evaluation') || lowerText.includes('encounter')) {
      const faceToFacePattern = /(?:face to face|evaluation|encounter)(?:\s*assessment|\s*meeting)?[\s:]*([A-Za-z0-9\s&,.()\-'\/]+)(?:[\r\n]|finding|result)/i;
      const faceToFaceMatch = text.match(faceToFacePattern);
      
      if (faceToFaceMatch && faceToFaceMatch[1]) {
        result.faceToFace = faceToFaceMatch[1].trim();
      } else {
        // Try to find paragraphs containing face to face keywords
        const faceToFaceKeywords = ['face to face', 'evaluation', 'encounter', 'consultation', 'visit'];
        result.faceToFace = this.findParagraphsWithKeywords(text, faceToFaceKeywords);
      }
    }
    
    // Extract medical history
    if (lowerText.includes('history') || lowerText.includes('past medical') || lowerText.includes('pmh')) {
      const historyPattern = /(?:history|past medical history|pmh)(?:\s*of)?[\s:]*([A-Za-z0-9\s&,.()\-'\/]+)(?:[\r\n]|allergies|medications)/i;
      const historyMatch = text.match(historyPattern);
      
      if (historyMatch && historyMatch[1]) {
        result.history = historyMatch[1].trim();
      } else {
        // Try to find paragraphs containing history keywords
        const historyKeywords = ['medical history', 'pmh', 'past medical', 'hpi', 'history of present illness'];
        result.history = this.findParagraphsWithKeywords(text, historyKeywords);
      }
    }
    
    // Extract mental health state
    if (lowerText.includes('mental') || lowerText.includes('psychiatric') || lowerText.includes('psychological') || lowerText.includes('mood')) {
      const mentalPattern = /(?:mental status|psychiatric|psychological|mood)(?:\s*assessment|\s*evaluation)?[\s:]*([A-Za-z0-9\s&,.()\-'\/]+)(?:[\r\n]|orientation|consciousness)/i;
      const mentalMatch = text.match(mentalPattern);
      
      if (mentalMatch && mentalMatch[1]) {
        result.mentalHealthState = mentalMatch[1].trim();
      } else {
        // Try to find paragraphs containing mental health keywords
        const mentalKeywords = ['mental', 'psychiatric', 'psychological', 'mood', 'affect', 'orientation', 'alert'];
        result.mentalHealthState = this.findParagraphsWithKeywords(text, mentalKeywords);
      }
    }
    
    // Extract additional comments
    // For additional comments, we'll look for sections that might contain important information
    // that wasn't captured in the other fields
    const commentKeywords = ['note', 'comment', 'remark', 'additional', 'other', 'plan', 'recommendation'];
    const additionalComments = this.findParagraphsWithKeywords(text, commentKeywords);
    
    if (additionalComments) {
      result.additionalComments = additionalComments;
    }
    
    // Provide default values for any fields that are still empty
    Object.keys(result).forEach(key => {
      if (!result[key] || result[key].trim() === '') {
        switch (key) {
          case 'insurance':
            result[key] = 'Not specified in document';
            break;
          case 'location':
            result[key] = 'Location not found in document';
            break;
          case 'dx':
            result[key] = 'No diagnosis information found';
            break;
          case 'pcp':
            result[key] = 'Primary care provider not specified';
            break;
          case 'dc':
            result[key] = 'No discharge information found';
            break;
          case 'wounds':
            result[key] = 'No wound information found';
            break;
          case 'antibiotics':
            result[key] = 'No antibiotic information found';
            break;
          case 'cardiacDrips':
            result[key] = 'No cardiac drip information found';
            break;
          case 'labs':
            result[key] = 'No lab results found in document';
            break;
          case 'faceToFace':
            result[key] = 'No face to face evaluation information found';
            break;
          case 'history':
            result[key] = 'No medical history information found';
            break;
          case 'mentalHealthState':
            result[key] = 'No mental health information found';
            break;
          case 'additionalComments':
            result[key] = 'No additional comments or notes found';
            break;
          default:
            if (key !== 'extractionMethod' && key !== 'extractionDate') {
              result[key] = 'Not found in document';
            }
        }
      }
    });
    
    return result;
  }
  
  /**
   * Find text near specified keywords in the document
   * @param {string} text - Document text
   * @param {Array} keywords - Array of keywords to search for
   * @param {number} lineCount - Number of lines to include before and after match
   * @returns {string} Found text or empty string
   */
  findTextNearKeywords(text, keywords, lineCount = 3) {
    const lines = text.split('\n');
    const lowerLines = lines.map(line => line.toLowerCase());
    
    // Find the first line that contains one of the keywords
    for (let i = 0; i < lowerLines.length; i++) {
      const line = lowerLines[i];
      
      // Check if this line contains any of the keywords
      if (keywords.some(keyword => line.includes(keyword))) {
        // Get the surrounding lines
        const startIndex = Math.max(0, i - lineCount);
        const endIndex = Math.min(lines.length - 1, i + lineCount);
        
        // Extract the lines
        const extractedLines = lines.slice(startIndex, endIndex + 1);
        return extractedLines.join(' ').trim();
      }
    }
    
    return '';
  }
  
  /**
   * Find paragraphs that contain specified keywords
   * @param {string} text - Document text
   * @param {Array} keywords - Array of keywords to search for
   * @returns {string} Found paragraphs or empty string
   */
  findParagraphsWithKeywords(text, keywords) {
    // Split text into paragraphs (text blocks separated by multiple newlines)
    const paragraphs = text.split(/\n\s*\n/);
    
    // Find paragraphs containing the keywords
    const matchingParagraphs = paragraphs.filter(paragraph => {
      const lowerParagraph = paragraph.toLowerCase();
      return keywords.some(keyword => lowerParagraph.includes(keyword));
    });
    
    // Return the matching paragraphs
    if (matchingParagraphs.length > 0) {
      // Limit the total length to avoid extremely long results
      let result = matchingParagraphs.join('\n\n');
      if (result.length > 500) {
        result = result.substring(0, 500) + '...';
      }
      return result;
    }
    
    return '';
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