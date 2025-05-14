/**
 * Enhanced service for extracting text from PDF documents with OCR
 * Processes PDFs page by page using PDF.js and Tesseract.js
 */
import Tesseract from 'tesseract.js';
import DocumentReferenceService from './DocumentReferenceService';

// Import PDF.js statically
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';

// Define the worker source
if (typeof window !== 'undefined' && 'Worker' in window) {
  // In web environments, set a CDN path for the worker
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/legacy/build/pdf.worker.min.js';
}

// Use the imported pdfjs directly
const pdfjsLib = pdfjs;

// Simple wrapper function to maintain API compatibility
const loadPdfJs = async () => {
  return pdfjsLib;
};

class PDFTextExtractionService {
  static instance;
  
  constructor() {
    // Internal properties
    this.referenceService = DocumentReferenceService.getInstance();
    this.progressCallback = null;
    this.tesseractWorker = null;
    this.currentPage = 0;
    this.totalPages = 0;
    this.cancelProcessing = false;
  }
  
  static getInstance() {
    if (!PDFTextExtractionService.instance) {
      PDFTextExtractionService.instance = new PDFTextExtractionService();
    }
    return PDFTextExtractionService.instance;
  }
  
  /**
   * Set a callback for progress updates
   * @param {Function} callback - Progress callback function
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }
  
  /**
   * Update progress
   * @param {string} status - Current status message
   * @param {number} progress - Progress value (0-1)
   */
  updateProgress(status, progress) {
    if (this.progressCallback) {
      this.progressCallback({
        status,
        progress,
        page: this.currentPage,
        totalPages: this.totalPages
      });
    }
  }
  
  /**
   * Cancel the current processing task
   */
  cancel() {
    this.cancelProcessing = true;
  }
  
  /**
   * Extract text from the PDF using OCR
   * @param {string} uri - URI of the PDF (blob URL or file URL)
   * @returns {Promise<Object>} Extraction result
   */
  async extractText(uri) {
    try {
      // Reset cancel flag
      this.cancelProcessing = false;
      
      this.updateProgress('Starting PDF processing', 0.05);
      console.log('Extracting text from PDF:', uri);
      
      // Load PDF.js
      const pdfjs = await loadPdfJs();
      if (!pdfjs) {
        throw new Error('Failed to load PDF.js library');
      }
      
      // Load the PDF document
      this.updateProgress('Loading PDF document', 0.1);
      const loadingTask = pdfjs.getDocument(uri);
      const pdf = await loadingTask.promise;
      this.totalPages = pdf.numPages;
      
      console.log(`PDF loaded successfully with ${this.totalPages} pages`);
      this.updateProgress('PDF loaded', 0.15);
      
      // Initialize Tesseract worker if needed
      if (!this.tesseractWorker) {
        this.updateProgress('Initializing OCR engine', 0.2);
        
        try {
          // Create worker with the logger option that receives progress updates
          this.tesseractWorker = await Tesseract.createWorker('eng', 1, {
            logger: progress => {
              // Only update for meaningful progress changes
              if (progress.status && typeof progress.progress === 'number') {
                console.log(`OCR progress: ${progress.status}, ${Math.round(progress.progress * 100)}%`);
                
                // Calculate overall progress (OCR is 60% of total process)
                // 20% - Initial loading and setup
                // 60% - OCR processing (divided among pages)
                // 20% - Post-processing and section identification
                const baseProgress = 0.2; // After setup
                const ocrWeight = 0.6; // OCR is 60% of total process
                const progressPerPage = ocrWeight / this.totalPages;
                const pageProgress = progressPerPage * (this.currentPage - 1);
                const ocrProgress = progressPerPage * progress.progress;
                
                this.updateProgress(
                  `OCR: Page ${this.currentPage}/${this.totalPages} - ${progress.status}`,
                  baseProgress + pageProgress + ocrProgress
                );
              }
            }
          });
          
          console.log('Tesseract worker initialized with English language');
        } catch (initError) {
          console.error('Failed to initialize Tesseract worker:', initError);
          throw new Error(`OCR initialization failed: ${initError.message}`);
        }
      }
      
      // Process each page
      let fullText = '';
      const pageResults = [];
      
      for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
        // Check if processing was canceled
        if (this.cancelProcessing) {
          console.log('PDF processing canceled');
          throw new Error('Processing canceled by user');
        }
        
        this.currentPage = pageNum;
        this.updateProgress(
          `Rendering page ${pageNum}/${this.totalPages}`, 
          0.2 + (0.6 * (pageNum - 1) / this.totalPages)
        );
        
        // Get the page
        const page = await pdf.getPage(pageNum);
        
        try {
          // Extract text using OCR
          const pageText = await this.extractTextFromPage(page, pageNum);
          
          // Store the page text
          pageResults.push({
            pageNum,
            text: pageText,
          });
          
          // Add page text to full text with page markers
          fullText += `\n\n--- Page ${pageNum} ---\n\n${pageText}`;
          
        } catch (pageError) {
          console.error(`Error processing page ${pageNum}:`, pageError);
          // Add error marker to full text
          fullText += `\n\n--- Page ${pageNum} (Error: ${pageError.message}) ---\n\n`;
        }
      }
      
      // Process the extracted text
      this.updateProgress('Processing OCR results', 0.85);
      
      // Identify sections in the text
      const sections = this.identifySections(fullText);
      
      // Create reference points
      const references = this.createReferencePoints(fullText);
      
      this.updateProgress('OCR complete', 1.0);
      
      return {
        text: fullText,
        isOcr: true,
        pages: this.totalPages,
        pageResults: pageResults,
        sections: sections,
        references: references
      };
    } catch (error) {
      console.error('Text extraction error:', error);
      
      // Return empty result with error
      return {
        text: '',
        isOcr: true,
        pages: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Extract text from a single PDF page using OCR
   * @param {Object} page - PDF.js page object
   * @param {number} pageNum - Page number
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromPage(page, pageNum) {
    // Set scale based on viewport size for better OCR results
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Use higher scale for better OCR results (but not too high to avoid memory issues)
    const scale = Math.min(2.0, Math.max(1.5, 1500 / Math.max(viewport.width, viewport.height)));
    const scaledViewport = page.getViewport({ scale });
    
    console.log(`Rendering page ${pageNum} with scale ${scale}`);
    this.updateProgress(`Rendering page ${pageNum}`, 0.2 + (0.6 * (pageNum - 1 + 0.3) / this.totalPages));
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = scaledViewport.height;
    canvas.width = scaledViewport.width;
    
    // Render the page to canvas
    await page.render({
      canvasContext: context,
      viewport: scaledViewport
    }).promise;
    
    console.log(`Page ${pageNum} rendered to canvas, size: ${canvas.width}x${canvas.height}`);
    this.updateProgress(`Analyzing page ${pageNum}`, 0.2 + (0.6 * (pageNum - 1 + 0.6) / this.totalPages));
    
    // Convert canvas to image data URL (PNG format for better quality)
    const imageDataUrl = canvas.toDataURL('image/png');
    
    // Perform OCR on the page image
    this.updateProgress(`OCR processing page ${pageNum}`, 0.2 + (0.6 * (pageNum - 1 + 0.7) / this.totalPages));
    
    // Use recognition with optimal settings
    const result = await this.tesseractWorker.recognize(imageDataUrl, {
      tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
      preserve_interword_spaces: '1',
    });
    
    const pageText = result.data.text;
    console.log(`Extracted text from page ${pageNum}, length: ${pageText.length} chars, confidence: ${result.data.confidence}%`);
    
    // Clean up canvas to free memory
    canvas.width = 0;
    canvas.height = 0;
    
    return pageText;
  }
  
  /**
   * Create reference points for extracted text
   * @param {string} text - Extracted text
   * @returns {Array} Reference points
   */
  createReferencePoints(text) {
    // Split the text into sections
    const sections = this.identifySections(text);
    
    // Create reference points for each section
    const referencePoints = sections.map((section, index) => ({
      id: `section-${index + 1}`,
      text: section.text.substring(0, 300), // Limit text length for references
      type: section.type,
      position: {
        start: text.indexOf(section.text),
        end: text.indexOf(section.text) + Math.min(section.text.length, 300)
      }
    }));
    
    return referencePoints;
  }
  
  /**
   * Identify different sections in the extracted text
   * @param {string} text - Extracted text
   * @returns {Array} Identified sections
   */
  identifySections(text) {
    // Simple section identification by looking for headers and paragraphs
    const sections = [];
    
    // Skip if text is empty
    if (!text || text.trim() === '') {
      return sections;
    }
    
    // Split text into paragraphs (respecting page markers)
    const paragraphs = text.split(/\n\s*\n/)
      .filter(p => p.trim().length > 0 && !p.trim().startsWith('---'));
    
    let currentType = 'Header';
    let currentContent = '';
    
    // Process each paragraph
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      
      // Skip empty paragraphs
      if (!trimmed) continue;
      
      // Skip page markers
      if (trimmed.startsWith('---') && trimmed.includes('Page')) {
        continue;
      }
      
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
      (text.length < 30 && !text.includes(' ')) ||
      // Contains common header keywords
      /(PATIENT|INFORMATION|DOCTOR|ASSESSMENT|DIAGNOSIS|MEDICATION|HISTORY|REFERRAL):?$/i.test(text)
    );
  }
  
  /**
   * Determine the type of a section based on its content
   * @param {string} text - Section text
   * @returns {string} Section type
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
    
    if (lowerText.includes('assessment')) {
      return 'Assessment';
    }
    
    if (lowerText.includes('plan')) {
      return 'Treatment Plan';
    }
    
    // Default section type
    return 'General Information';
  }
  
  /**
   * Clean up resources when done
   */
  async cleanup() {
    if (this.tesseractWorker) {
      try {
        await this.tesseractWorker.terminate();
        this.tesseractWorker = null;
        console.log('Tesseract worker terminated');
      } catch (error) {
        console.error('Error terminating Tesseract worker:', error);
      }
    }
  }
}

export default PDFTextExtractionService;