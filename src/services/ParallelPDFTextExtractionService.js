/**
 * Simplified PDF Text Extraction Service
 * Removed complex parallel processing, section identification, and unnecessary features
 */
import Tesseract from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';

// Set PDF.js worker for web
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/legacy/build/pdf.worker.min.js';
}

class ParallelPDFTextExtractionService {
  static instance;
  
  constructor() {
    this.progressCallback = null;
    this.cancelProcessing = false;
    this.maxWorkers = 20; // Reduced from 20 to 3 for simplicity
  }
  
  static getInstance() {
    if (!ParallelPDFTextExtractionService.instance) {
      ParallelPDFTextExtractionService.instance = new ParallelPDFTextExtractionService();
    }
    return ParallelPDFTextExtractionService.instance;
  }
  
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }
  
  updateProgress(status, progress, currentStep = '', message = '') {
    if (this.progressCallback) {
      this.progressCallback({
        status,
        progress,
        currentStep,
        message
      });
    }
  }
  
  cancel() {
    this.cancelProcessing = true;
  }
  
  /**
   * Extract text from PDF - simplified approach
   */
  async extractText(uri) {
    try {
      this.cancelProcessing = false;
      
      this.updateProgress('processing', 0.05, 'Starting', 'Loading PDF document');
      console.log('Extracting text from PDF:', uri);
      
      // Load PDF
      const loadingTask = pdfjs.getDocument(uri);
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      
      console.log(`PDF loaded with ${totalPages} pages`);
      this.updateProgress('processing', 0.15, 'PDF Loaded', `Processing ${totalPages} pages`);
      
      // Process pages with limited parallelism
      const pageTexts = [];
      const workers = await this.createWorkers();
      
      try {
        // Process pages in small batches
        const batchSize = Math.min(this.maxWorkers, totalPages);
        
        for (let i = 0; i < totalPages; i += batchSize) {
          if (this.cancelProcessing) {
            throw new Error('Processing canceled');
          }
          
          const batchEnd = Math.min(i + batchSize, totalPages);
          const batchPromises = [];
          
          for (let pageNum = i + 1; pageNum <= batchEnd; pageNum++) {
            const workerIndex = (pageNum - 1) % workers.length;
            const worker = workers[workerIndex];
            
            batchPromises.push(this.processPage(pdf, pageNum, worker));
          }
          
          const batchResults = await Promise.all(batchPromises);
          pageTexts.push(...batchResults);
          
          const progress = 0.2 + (0.7 * (batchEnd / totalPages));
          this.updateProgress('processing', progress, 'OCR Processing', 
            `Completed ${batchEnd}/${totalPages} pages`);
        }
        
        // Combine results
        this.updateProgress('processing', 0.95, 'Finalizing', 'Combining page results');
        
        let fullText = '';
        pageTexts.forEach((pageResult, index) => {
          if (pageResult && !pageResult.error) {
            fullText += `\n\n--- Page ${index + 1} ---\n\n${pageResult.text}`;
          }
        });
        
        await this.cleanupWorkers(workers);
        
        this.updateProgress('complete', 1.0, 'Complete', 'Text extraction completed');
        
        return {
          text: fullText,
          isOcr: true,
          pages: totalPages
        };
        
      } catch (error) {
        await this.cleanupWorkers(workers);
        throw error;
      }
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      this.updateProgress('error', 0.5, 'Error', `Extraction failed: ${error.message}`);
      
      return {
        text: `Error extracting text: ${error.message}`,
        isOcr: true,
        pages: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Create a small number of Tesseract workers
   */
  async createWorkers() {
    console.log(`Creating ${this.maxWorkers} Tesseract workers`);
    const workers = [];
    
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = await Tesseract.createWorker('eng');
        workers.push(worker);
        console.log(`Created worker ${i + 1}/${this.maxWorkers}`);
      } catch (error) {
        console.warn(`Failed to create worker ${i + 1}:`, error);
        // Continue with fewer workers
        break;
      }
    }
    
    if (workers.length === 0) {
      throw new Error('Failed to create any Tesseract workers');
    }
    
    console.log(`Successfully created ${workers.length} workers`);
    return workers;
  }
  
  /**
   * Process a single page
   */
  async processPage(pdf, pageNum, worker) {
    try {
      const page = await pdf.getPage(pageNum);
      
      // Render page to canvas
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert to image and run OCR
      const imageDataUrl = canvas.toDataURL('image/png');
      
      let text = '';
      try {
        const { data: { text: extractedText } } = await worker.recognize(imageDataUrl);
        text = extractedText;
      } catch (error) {
        // Try fallback approach
        const result = await worker.recognize(imageDataUrl);
        text = result.data?.text || '';
      }
      
      // Clean up canvas
      canvas.width = 0;
      canvas.height = 0;
      
      console.log(`Page ${pageNum} processed: ${text.length} characters`);
      
      return {
        pageNum,
        text,
        error: false
      };
      
    } catch (error) {
      console.error(`Error processing page ${pageNum}:`, error);
      return {
        pageNum,
        text: `Error processing page ${pageNum}: ${error.message}`,
        error: true
      };
    }
  }
  
  /**
   * Clean up workers
   */
  async cleanupWorkers(workers) {
    console.log(`Cleaning up ${workers.length} workers`);
    
    const cleanupPromises = workers.map(worker => 
      worker.terminate().catch(err => console.warn('Error terminating worker:', err))
    );
    
    await Promise.all(cleanupPromises);
    console.log('All workers terminated');
  }
}

export default ParallelPDFTextExtractionService;