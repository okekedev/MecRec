/**
 * Enhanced service for extracting text from PDF documents with parallel OCR processing
 * Processes multiple PDF pages concurrently to improve performance
 */
import Tesseract from 'tesseract.js';
import DocumentReferenceService from './DocumentReferenceService';

// Import PDF.js statically
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';

// Define the worker source for web
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/legacy/build/pdf.worker.min.js';
}

class ParallelPDFTextExtractionService {
  static instance;
  
  constructor() {
    // Internal properties
    this.referenceService = DocumentReferenceService.getInstance();
    this.progressCallback = null;
    this.tesseractWorkers = [];  // We'll use multiple workers for parallelism
    this.maxWorkers = 20;         // Maximum number of concurrent workers
    this.currentPage = 0;
    this.totalPages = 0;
    this.cancelProcessing = false;
    this.completedPages = 0;
  }
  
  static getInstance() {
    if (!ParallelPDFTextExtractionService.instance) {
      ParallelPDFTextExtractionService.instance = new ParallelPDFTextExtractionService();
    }
    return ParallelPDFTextExtractionService.instance;
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
   * @param {number} page - Current page (optional)
   */
  updateProgress(status, progress, page = this.currentPage) {
    if (this.progressCallback) {
      this.progressCallback({
        status,
        progress,
        page: page,
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
   * Create a Tesseract worker for OCR
   * @param {number} workerIndex - Index of the worker for identification
   * @returns {Promise<Object>} Tesseract worker
   */
  async createTesseractWorker(workerIndex) {
    console.log(`Creating Tesseract worker #${workerIndex}`);
    
    // Try the v6 approach with logger in options
    try {
      // This is the approach for newer versions (v5+)
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: progress => {
          if (progress.status && typeof progress.progress === 'number') {
            console.log(`Worker #${workerIndex} progress: ${progress.status}, ${Math.round(progress.progress * 100)}%`);
            
            // We don't update the main progress bar for each worker's progress
            // as it would be confusing. Instead, we'll update on page completion.
          }
        }
      });
      
      console.log(`Created Tesseract worker #${workerIndex} using v5+ approach`);
      return worker;
    } catch (error) {
      console.warn(`Failed to create worker #${workerIndex} using v5+ approach, trying v4 approach:`, error);
      
      // Fall back to v4 approach
      try {
        const worker = await Tesseract.createWorker({
          logger: progress => {
            if (progress.status && typeof progress.progress === 'number') {
              console.log(`Worker #${workerIndex} progress: ${progress.status}, ${Math.round(progress.progress * 100)}%`);
            }
          }
        });
        
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        
        console.log(`Created Tesseract worker #${workerIndex} using v4 approach`);
        return worker;
      } catch (error2) {
        console.error(`Failed to create worker #${workerIndex} using both approaches:`, error2);
        throw new Error(`Failed to initialize Tesseract worker #${workerIndex}: ${error2.message}`);
      }
    }
  }
  
  /**
   * Initialize multiple Tesseract workers for parallel processing
   */
  async initializeWorkers() {
    console.log(`Initializing ${this.maxWorkers} Tesseract workers for parallel processing`);
    
    // Create the workers in parallel
    const workerPromises = [];
    for (let i = 0; i < this.maxWorkers; i++) {
      workerPromises.push(this.createTesseractWorker(i + 1));
    }
    
    // Wait for all workers to be created
    this.tesseractWorkers = await Promise.all(workerPromises);
    console.log(`Successfully initialized ${this.tesseractWorkers.length} workers`);
  }
  
  /**
   * Extract text from the PDF using parallel OCR
   * @param {string} uri - URI of the PDF (blob URL or file URL)
   * @returns {Promise<Object>} Extraction result
   */
  async extractText(uri) {
    try {
      // Reset variables
      this.cancelProcessing = false;
      this.completedPages = 0;
      
      this.updateProgress('Starting PDF processing', 0.05);
      console.log('Extracting text from PDF:', uri);
      
      // Load the PDF document
      this.updateProgress('Loading PDF document', 0.1);
      const loadingTask = pdfjs.getDocument(uri);
      const pdf = await loadingTask.promise;
      this.totalPages = pdf.numPages;
      
      console.log(`PDF loaded successfully with ${this.totalPages} pages`);
      this.updateProgress('PDF loaded', 0.15);
      
      // Initialize Tesseract workers for parallel processing
      this.updateProgress('Initializing OCR engines', 0.2);
      await this.initializeWorkers();
      
      // Create an array to hold the results for each page
      const pageResults = new Array(this.totalPages);
      
      // Process pages in batches to limit concurrency
      const processPageBatch = async (startPage, endPage) => {
        console.log(`Processing page batch from ${startPage} to ${endPage}`);
        
        // Create an array of page processing promises
        const pagePromises = [];
        
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          // Check if processing was canceled
          if (this.cancelProcessing) {
            console.log('PDF processing canceled');
            throw new Error('Processing canceled by user');
          }
          
          // Assign a worker from the pool (round-robin)
          const workerIndex = (pageNum - 1) % this.tesseractWorkers.length;
          const worker = this.tesseractWorkers[workerIndex];
          
          // Create promise for processing this page
          const pagePromise = (async () => {
            try {
              // Get the page
              this.updateProgress(`Rendering page ${pageNum}`, 0.3, pageNum);
              const page = await pdf.getPage(pageNum);
              
              // Process the page with the assigned worker
              const pageText = await this.extractTextFromPage(page, pageNum, worker, workerIndex);
              
              // Store the result
              pageResults[pageNum - 1] = {
                pageNum,
                text: pageText,
              };
              
              // Update progress
              this.completedPages++;
              const overallProgress = 0.3 + (0.6 * this.completedPages / this.totalPages);
              this.updateProgress(
                `Completed ${this.completedPages}/${this.totalPages} pages`, 
                overallProgress
              );
              
              console.log(`Page ${pageNum} completed (${this.completedPages}/${this.totalPages})`);
            } catch (error) {
              console.error(`Error processing page ${pageNum}:`, error);
              // Store error in results
              pageResults[pageNum - 1] = {
                pageNum,
                text: `Error processing page ${pageNum}: ${error.message}`,
                error: true
              };
              
              // Still increment completed pages
              this.completedPages++;
            }
          })();
          
          pagePromises.push(pagePromise);
        }
        
        // Wait for all pages in this batch to complete
        await Promise.all(pagePromises);
      };
      
      // Process all pages in batches with size equal to number of workers
      // This approach maintains the worker pool and limits memory usage
      const batchSize = this.tesseractWorkers.length;
      for (let i = 1; i <= this.totalPages; i += batchSize) {
        const batchEnd = Math.min(i + batchSize - 1, this.totalPages);
        await processPageBatch(i, batchEnd);
      }
      
      // Combine all page results
      this.updateProgress('Combining page results', 0.9);
      
      let fullText = '';
      for (let i = 0; i < pageResults.length; i++) {
        const result = pageResults[i];
        if (result && !result.error) {
          fullText += `\n\n--- Page ${result.pageNum} ---\n\n${result.text}`;
        } else if (result && result.error) {
          fullText += `\n\n--- Page ${result.pageNum} (Error) ---\n\n`;
        }
      }
      
      // Process the extracted text
      this.updateProgress('Processing OCR results', 0.95);
      
      // Identify sections in the text
      const sections = this.identifySections(fullText);
      
      // Create reference points
      const references = this.createReferencePoints(fullText);
      
      this.updateProgress('OCR complete', 1.0);
      
      // Clean up workers
      await this.cleanupWorkers();
      
      return {
        text: fullText,
        isOcr: true,
        pages: this.totalPages,
        pageResults: pageResults.filter(r => r && !r.error),
        sections: sections,
        references: references
      };
    } catch (error) {
      console.error('Text extraction error:', error);
      
      // Clean up workers
      await this.cleanupWorkers();
      
      // Return empty result with error
      return {
        text: 'Error extracting text: ' + error.message,
        isOcr: true,
        pages: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Clean up all Tesseract workers
   */
  async cleanupWorkers() {
    console.log(`Cleaning up ${this.tesseractWorkers.length} Tesseract workers`);
    
    // Terminate all workers
    const terminationPromises = this.tesseractWorkers.map(worker => 
      worker.terminate().catch(err => console.warn('Error terminating worker:', err))
    );
    
    // Wait for all workers to terminate
    await Promise.all(terminationPromises);
    
    // Clear the workers array
    this.tesseractWorkers = [];
    console.log('All workers terminated');
  }
  
  /**
   * Extract text from a single PDF page using OCR
   * @param {Object} page - PDF.js page object
   * @param {number} pageNum - Page number
   * @param {Object} worker - Tesseract worker to use
   * @param {number} workerIndex - Index of the worker
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromPage(page, pageNum, worker, workerIndex) {
    // Set scale based on viewport size for better OCR results
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Use higher scale for better OCR results (but not too high to avoid memory issues)
    const scale = Math.min(2.0, Math.max(1.5, 1500 / Math.max(viewport.width, viewport.height)));
    const scaledViewport = page.getViewport({ scale });
    
    console.log(`Worker #${workerIndex+1}: Rendering page ${pageNum} with scale ${scale}`);
    
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
    
    console.log(`Worker #${workerIndex+1}: Page ${pageNum} rendered to canvas, size: ${canvas.width}x${canvas.height}`);
    
    // Convert canvas to image data URL (PNG format for better quality)
    const imageDataUrl = canvas.toDataURL('image/png');
    
    console.log(`Worker #${workerIndex+1}: Starting OCR on page ${pageNum}`);
    
    try {
      // Try the v5+ recognize method
      const { data: { text } } = await worker.recognize(imageDataUrl);
      console.log(`Worker #${workerIndex+1}: Extracted text from page ${pageNum}, length: ${text.length} chars`);
      
      // Clean up canvas to free memory
      canvas.width = 0;
      canvas.height = 0;
      
      return text;
    } catch (error) {
      console.error(`Worker #${workerIndex+1}: Error with v5+ recognize method, trying v4 approach:`, error);
      
      // Fall back to v4 approach
      try {
        const result = await worker.recognize(imageDataUrl);
        const text = result.data.text;
        console.log(`Worker #${workerIndex+1}: Extracted text from page ${pageNum} using v4 approach, length: ${text.length} chars`);
        
        // Clean up canvas to free memory
        canvas.width = 0;
        canvas.height = 0;
        
        return text;
      } catch (error2) {
        console.error(`Worker #${workerIndex+1}: Both OCR approaches failed:`, error2);
        
        // Clean up canvas to free memory
        canvas.width = 0;
        canvas.height = 0;
        
        throw new Error(`OCR recognition failed: ${error2.message}`);
      }
    }
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
      (text.length < 30 && !text.includes(' '))
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
    
    // Default section type
    return 'General Information';
  }
}

export default ParallelPDFTextExtractionService;