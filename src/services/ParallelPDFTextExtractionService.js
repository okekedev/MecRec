/**
 * Tesseract-Only PDFTextExtractionService - Clean production version
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
    this.maxWorkers = 20;
    
    // Store positions during OCR processing
    this.lastExtractedPositions = [];
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
   * Get positions from last extraction
   */
  getLastExtractedPositions() {
    return this.lastExtractedPositions;
  }
  
  /**
   * Extract text using Tesseract.js OCR as primary method
   */
  async extractText(uri) {
    try {
      this.cancelProcessing = false;
      
      this.updateProgress('processing', 0.05, 'Starting', 'Loading PDF document');
      
      // Clear previous positions
      this.lastExtractedPositions = [];
      
      // Load PDF (still needed to render pages to canvas for OCR)
      const loadingTask = pdfjs.getDocument(uri);
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      
      this.updateProgress('processing', 0.15, 'PDF Loaded', `Processing ${totalPages} pages with OCR`);
      
      // Process directly with OCR
      this.updateProgress('processing', 0.2, 'OCR Processing', 'Starting OCR text extraction with position tracking');
      
      return await this.processWithOCRAndRealPositions(pdf, totalPages);
      
    } catch (error) {
      this.updateProgress('error', 0.5, 'Error', `OCR extraction failed: ${error.message}`);
      
      return {
        text: `Error extracting text: ${error.message}`,
        isOcr: true,
        pages: 0,
        error: error.message,
        positions: []
      };
    }
  }
  
  /**
   * OCR processing that captures REAL text positions from Tesseract.js
   */
  async processWithOCRAndRealPositions(pdf, totalPages) {
    const workers = await this.createWorkers();
    const pageTexts = [];
    const allPositions = [];
    
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
          
          batchPromises.push(this.processPageWithOCR(pdf, pageNum, worker));
        }
        
        const batchResults = await Promise.all(batchPromises);
        
        // Collect both text and positions
        batchResults.forEach(result => {
          if (result && !result.error) {
            pageTexts.push(result);
            if (result.positions) {
              allPositions.push(...result.positions);
            }
          }
        });
        
        const progress = 0.3 + (0.6 * (batchEnd / totalPages));
        this.updateProgress('processing', progress, 'OCR Processing', 
          `OCR completed ${batchEnd}/${totalPages} pages`);
      }
      
      // Combine results
      this.updateProgress('processing', 0.95, 'Finalizing', 'Combining OCR results');
      
      let fullText = '';
      pageTexts.forEach((pageResult, index) => {
        if (pageResult && !pageResult.error) {
          fullText += `\n\n--- Page ${index + 1} ---\n\n${pageResult.text}`;
        }
      });
      
      // Store positions for later use
      this.lastExtractedPositions = allPositions;
      
      await this.cleanupWorkers(workers);
      
      this.updateProgress('complete', 1.0, 'Complete', 'OCR text extraction with real positions completed');
      
      return {
        text: fullText,
        isOcr: true,
        pages: totalPages,
        positions: allPositions,
        confidence: 'Tesseract OCR'
      };
      
    } catch (error) {
      await this.cleanupWorkers(workers);
      throw error;
    }
  }
  
  /**
   * Process single page with Tesseract OCR and capture REAL word positions
   */
  async processPageWithOCR(pdf, pageNum, worker) {
    try {
      const page = await pdf.getPage(pageNum);
      
      // Render page to canvas with high resolution for better OCR
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert canvas to blob for Tesseract
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      // Run Tesseract OCR with blocks output to get real bounding boxes
      const { data } = await worker.recognize(blob, {
        tesseract_pageseg_mode: 6,    // Uniform block of text
        preserve_interword_spaces: 1  // Better text formatting
      }, {
        // Request blocks output format to get bounding boxes
        blocks: true,
        text: true
      });
      
      // Extract text
      const extractedText = data.text || '';
      
      // Extract REAL word positions from blocks output
      const positions = [];
      
      if (data.blocks && data.blocks.length > 0) {
        // Navigate through blocks -> paragraphs -> lines -> words
        data.blocks.forEach((block, blockIndex) => {
          if (block.paragraphs) {
            block.paragraphs.forEach((paragraph, paraIndex) => {
              if (paragraph.lines) {
                paragraph.lines.forEach((line, lineIndex) => {
                  if (line.words) {
                    line.words.forEach((word, wordIndex) => {
                      if (word.text && word.text.trim() && word.confidence > 30) {
                        // Get REAL positions from Tesseract blocks output
                        const bbox = word.bbox;
                        if (bbox && typeof bbox.x0 === 'number') {
                          positions.push({
                            text: word.text.trim(),
                            page: pageNum,
                            x: bbox.x0,
                            y: bbox.y0,
                            width: bbox.x1 - bbox.x0,
                            height: bbox.y1 - bbox.y0,
                            confidence: word.confidence,
                            index: wordIndex,
                            source: 'tesseract-ocr',
                            blockIndex,
                            paraIndex,
                            lineIndex,
                            wordIndex
                          });
                        }
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
      
      // Clean up canvas
      canvas.width = 0;
      canvas.height = 0;
      
      return {
        pageNum,
        text: extractedText,
        positions: positions,
        error: false
      };
      
    } catch (error) {
      return {
        pageNum,
        text: `Error processing page ${pageNum}: ${error.message}`,
        positions: [],
        error: true
      };
    }
  }
  
  /**
   * Create Tesseract workers
   */
  async createWorkers() {
    const workers = [];
    
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = await Tesseract.createWorker('eng');
        workers.push(worker);
      } catch (error) {
        break;
      }
    }
    
    if (workers.length === 0) {
      throw new Error('Failed to create any Tesseract OCR workers');
    }
    
    return workers;
  }
  
  /**
   * Clean up workers
   */
  async cleanupWorkers(workers) {
    const cleanupPromises = workers.map(worker => 
      worker.terminate().catch(() => {})
    );
    
    await Promise.all(cleanupPromises);
  }
}

export default ParallelPDFTextExtractionService;