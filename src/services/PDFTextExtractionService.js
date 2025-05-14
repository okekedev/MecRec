/**
 * Service for extracting text from PDF documents with OCR
 * Web-specific implementation using Tesseract.js
 */
import Tesseract from 'tesseract.js';
import { DocumentReferenceService } from './DocumentReferenceService';

class PDFTextExtractionService {
  static instance;
  
  constructor() {
    this.referenceService = DocumentReferenceService.getInstance();
    this.progressCallback = null;
    this.tesseractWorker = null;
  }
  
  static getInstance() {
    if (!PDFTextExtractionService.instance) {
      PDFTextExtractionService.instance = new PDFTextExtractionService();
    }
    return PDFTextExtractionService.instance;
  }
  
  /**
   * Set a callback for progress updates
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }
  
  /**
   * Update progress
   */
  updateProgress(status, progress) {
    if (this.progressCallback) {
      this.progressCallback({
        status,
        progress,
        page: 1,
        totalPages: 1
      });
    }
  }
  
  /**
   * Extract text from the PDF using OCR
   * @param {string} uri - URI of the PDF (blob URL or http URL)
   * @returns {Promise<Object>} Extraction result
   */
  async extractText(uri) {
    try {
      this.updateProgress('Starting OCR extraction', 0.1);
      
      // Load the image (In this web implementation, we assume the URI is an image)
      // This could be a PDF URL, but for simplicity we'll just OCR it directly
      console.log('Extracting text from image:', uri);
      
      // Initialize Tesseract worker if needed
      if (!this.tesseractWorker) {
        this.updateProgress('Initializing OCR engine', 0.2);
        
        this.tesseractWorker = await Tesseract.createWorker({
          logger: progress => {
            console.log(`OCR progress: ${progress.status}, ${Math.round(progress.progress * 100)}%`);
            this.updateProgress(`OCR: ${progress.status}`, 0.2 + (progress.progress * 0.7));
          }
        });
        
        await this.tesseractWorker.loadLanguage('eng');
        await this.tesseractWorker.initialize('eng');
      }
      
      // Perform OCR on the image
      this.updateProgress('Performing OCR', 0.3);
      const result = await this.tesseractWorker.recognize(uri);
      
      const extractedText = result.data.text;
      console.log('OCR extracted text length:', extractedText.length);
      console.log('OCR confidence:', result.data.confidence);
      
      // Process the extracted text
      this.updateProgress('Processing OCR results', 0.9);
      
      // Identify sections in the text
      const sections = this.identifySections(extractedText);
      
      // Create reference points
      const references = this.createReferencePoints(extractedText);
      
      this.updateProgress('OCR complete', 1.0);
      
      return {
        text: extractedText,
        isOcr: true,
        pages: 1,
        confidence: result.data.confidence,
        sections: sections,
        references: references
      };
    } catch (error) {
      console.error('OCR extraction error:', error);
      
      // Return empty result
      return {
        text: '',
        isOcr: true,
        pages: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Create reference points for extracted text
   */
  createReferencePoints(text) {
    // Split the text into sections
    const sections = this.identifySections(text);
    
    // Create reference points for each section
    const referencePoints = sections.map((section, index) => ({
      id: `section-${index + 1}`,
      text: section.text,
      type: section.type,
      position: {
        start: text.indexOf(section.text),
        end: text.indexOf(section.text) + section.text.length
      }
    }));
    
    return referencePoints;
  }
  
  /**
   * Identify different sections in the extracted text
   */
  identifySections(text) {
    // Simple section identification by looking for headers and paragraphs
    const sections = [];
    
    // Skip if text is empty
    if (!text || text.trim() === '') {
      return sections;
    }
    
    // Split text into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    let currentType = 'Header';
    let currentContent = '';
    
    // Process each paragraph
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      
      // Skip empty paragraphs
      if (!trimmed) continue;
      
      // Check if this looks like a section header
      const isHeader = this.isLikelyHeader(trimmed);
      
      if (isHeader) {
        // Save previous section if there is content
        if (currentContent) {
          sections.push({
            type: currentType,
            text: currentContent.trim()
          });
        }
        
        // Start a new section
        currentType = this.determineSectionType(trimmed);
        currentContent = trimmed;
      } else {
        // Add to current section
        currentContent += '\n\n' + trimmed;
      }
    }
    
    // Add the last section
    if (currentContent) {
      sections.push({
        type: currentType,
        text: currentContent.trim()
      });
    }
    
    return sections;
  }
  
  /**
   * Check if text is likely to be a header
   */
  isLikelyHeader(text) {
    // Headers are often short, all uppercase, or end with a colon
    return (
      (text === text.toUpperCase() && text.length < 50) ||
      text.endsWith(':') ||
      /^[A-Z][A-Za-z\s]{0,20}:/.test(text) || // Capitalized word followed by colon
      /^[IVX]+\.\s/.test(text) || // Roman numerals
      /^\d+\.\s/.test(text) // Numbered section
    );
  }
  
  /**
   * Determine the type of a section based on its content
   */
  determineSectionType(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('patient')) {
      return 'Patient Information';
    }
    
    if (lowerText.includes('referring') || lowerText.includes('physician')) {
      return 'Referring Physician';
    }
    
    if (lowerText.includes('reason') && lowerText.includes('referral')) {
      return 'Reason for Referral';
    }
    
    if (lowerText.includes('history')) {
      return 'Medical History';
    }
    
    if (lowerText.includes('medication')) {
      return 'Medications';
    }
    
    if (lowerText.includes('labs') || lowerText.includes('studies')) {
      return 'Labs/Studies';
    }
    
    if (lowerText.includes('clinical')) {
      return 'Clinical Information';
    }
    
    if (lowerText.includes('diagnosis')) {
      return 'Diagnosis';
    }
    
    // Default section type
    return 'General Information';
  }
}

export default PDFTextExtractionService;