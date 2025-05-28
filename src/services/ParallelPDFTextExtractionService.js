/**
 * Fixed ParallelPDFTextExtractionService - Properly capture positions during OCR
 * Updated to correctly extract word positions from Tesseract.js results
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
    this.maxWorkers = 2; // Reduced for better stability
    
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
   * Extract text AND positions in single OCR run
   */
  async extractText(uri) {
    try {
      this.cancelProcessing = false;
      
      this.updateProgress('processing', 0.05, 'Starting', 'Loading PDF document');
      console.log('Extracting text AND positions from PDF:', uri);
      
      // Clear previous positions
      this.lastExtractedPositions = [];
      
      // Load PDF
      const loadingTask = pdfjs.getDocument(uri);
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      
      console.log(`PDF loaded with ${totalPages} pages`);
      this.updateProgress('processing', 0.15, 'PDF Loaded', `Processing ${totalPages} pages`);
      
      // Try PDF.js text extraction first (for searchable PDFs)
      let pdfJsText = '';
      let pdfJsSuccess = false;
      let pdfJsPositions = [];
      
      try {
        console.log('DEBUG: Trying PDF.js text extraction...');
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          let pageText = '';
          textContent.items.forEach((item, index) => {
            if (item.str) {
              pageText += item.str + ' ';
              
              // Capture PDF.js positions
              pdfJsPositions.push({
                text: item.str.trim(),
                page: pageNum,
                x: item.transform[4],
                y: item.transform[5], 
                width: item.width,
                height: item.height,
                index: index,
                source: 'pdfjs'
              });
            }
          });
          
          if (pageText.trim()) {
            pdfJsText += `\n\n--- Page ${pageNum} ---\n\n${pageText.trim()}`;
          }
        }
        
        pdfJsSuccess = pdfJsText.trim().length > 100;
        
        if (pdfJsSuccess) {
          console.log(`DEBUG: ✅ PDF.js extraction successful - ${pdfJsText.length} characters, ${pdfJsPositions.length} positions`);
          this.lastExtractedPositions = pdfJsPositions;
          
          this.updateProgress('complete', 1.0, 'Text Extraction Complete', 
            `Extracted ${pdfJsText.length} characters using PDF.js`);
          
          return {
            text: pdfJsText,
            isOcr: false,
            pages: totalPages,
            confidence: 'PDF.js',
            positions: pdfJsPositions
          };
        }
      } catch (pdfJsError) {
        console.warn('DEBUG: PDF.js text extraction failed, falling back to OCR:', pdfJsError);
      }
      
      // Fall back to OCR with position capture
      console.log('DEBUG: Using OCR extraction with position capture...');
      this.updateProgress('processing', 0.3, 'OCR Processing', 'PDF text not searchable, using OCR with position tracking');
      
      return await this.processWithOCRAndPositions(pdf, totalPages);
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      this.updateProgress('error', 0.5, 'Error', `Extraction failed: ${error.message}`);
      
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
   * OCR processing that captures both text AND positions
   */
  async processWithOCRAndPositions(pdf, totalPages) {
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
          
          batchPromises.push(this.processPageWithOCRAndPositions(pdf, pageNum, worker));
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
        
        const progress = 0.4 + (0.5 * (batchEnd / totalPages));
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
      
      // Store positions for later use
      this.lastExtractedPositions = allPositions;
      console.log(`DEBUG: ✅ OCR complete - ${fullText.length} characters, ${allPositions.length} positions`);
      
      await this.cleanupWorkers(workers);
      
      this.updateProgress('complete', 1.0, 'Complete', 'OCR text extraction with positions completed');
      
      return {
        text: fullText,
        isOcr: true,
        pages: totalPages,
        positions: allPositions
      };
      
    } catch (error) {
      await this.cleanupWorkers(workers);
      throw error;
    }
  }
  
  /**
   * FIXED: Process single page and capture word positions correctly
   */
  async processPageWithOCRAndPositions(pdf, pageNum, worker) {
    try {
      console.log(`DEBUG: OCR processing page ${pageNum} with position capture...`);
      
      const page = await pdf.getPage(pageNum);
      
      // Render page to canvas with higher resolution for better OCR
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert canvas to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      // FIXED: Run OCR with explicit options to get word-level data
      const recognitionOptions = {
        rectangle: { left: 0, top: 0, width: canvas.width, height: canvas.height }
      };
      
      // First, let's see what data structure we get
      const result = await worker.recognize(blob, recognitionOptions);
      const { data } = result;
      
      // DEBUG: Log the complete data structure
      console.log(`DEBUG: Full OCR result structure for page ${pageNum}:`, {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        text: data?.text ? `${data.text.substring(0, 100)}...` : 'No text',
        confidence: data?.confidence,
        hasBlocks: !!data?.blocks,
        blockCount: data?.blocks?.length || 0,
        hasParagraphs: !!data?.paragraphs,
        paragraphCount: data?.paragraphs?.length || 0,
        hasLines: !!data?.lines,
        lineCount: data?.lines?.length || 0,
        hasWords: !!data?.words,
        wordCount: data?.words?.length || 0,
        hasSymbols: !!data?.symbols,
        symbolCount: data?.symbols?.length || 0
      });
      
      // Extract text
      const extractedText = data.text || '';
      
      // FIXED: Extract positions with extensive debugging
      const positions = [];
      
      // Method 0: Try blocks first (highest level)
      if (data.blocks && data.blocks.length > 0) {
        console.log(`DEBUG: Trying blocks approach - found ${data.blocks.length} blocks`);
        
        data.blocks.forEach((block, bIndex) => {
          if (block.paragraphs) {
            block.paragraphs.forEach((paragraph, pIndex) => {
              if (paragraph.lines) {
                paragraph.lines.forEach((line, lIndex) => {
                  if (line.words) {
                    line.words.forEach((word, wIndex) => {
                      if (word.text && word.text.trim() && word.confidence > 10) {
                        positions.push({
                          text: word.text.trim(),
                          page: pageNum,
                          x: word.bbox.x0,
                          y: word.bbox.y0,
                          width: word.bbox.x1 - word.bbox.x0,
                          height: word.bbox.y1 - word.bbox.y0,
                          confidence: word.confidence,
                          index: `b${bIndex}-p${pIndex}-l${lIndex}-w${wIndex}`,
                          source: 'ocr'
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
      
      // Method 1: Try direct paragraphs/lines/words hierarchy
      if (positions.length === 0 && data.paragraphs && data.paragraphs.length > 0) {
        console.log(`DEBUG: Trying paragraphs approach - found ${data.paragraphs.length} paragraphs`);
        
        data.paragraphs.forEach((paragraph, pIndex) => {
          if (paragraph.lines) {
            paragraph.lines.forEach((line, lIndex) => {
              if (line.words) {
                line.words.forEach((word, wIndex) => {
                  if (word.text && word.text.trim() && word.confidence > 10) {
                    positions.push({
                      text: word.text.trim(),
                      page: pageNum,
                      x: word.bbox.x0,
                      y: word.bbox.y0,
                      width: word.bbox.x1 - word.bbox.x0,
                      height: word.bbox.y1 - word.bbox.y0,
                      confidence: word.confidence,
                      index: `p${pIndex}-l${lIndex}-w${wIndex}`,
                      source: 'ocr'
                    });
                  }
                });
              }
            });
          }
        });
      }
      
      // Method 2: Try direct lines
      if (positions.length === 0 && data.lines && data.lines.length > 0) {
        console.log(`DEBUG: Trying lines approach - found ${data.lines.length} lines`);
        
        data.lines.forEach((line, lIndex) => {
          if (line.words) {
            line.words.forEach((word, wIndex) => {
              if (word.text && word.text.trim() && word.confidence > 10) {
                positions.push({
                  text: word.text.trim(),
                  page: pageNum,
                  x: word.bbox.x0,
                  y: word.bbox.y0,
                  width: word.bbox.x1 - word.bbox.x0,
                  height: word.bbox.y1 - word.bbox.y0,
                  confidence: word.confidence,
                  index: `l${lIndex}-w${wIndex}`,
                  source: 'ocr'
                });
              }
            });
          }
        });
      }
      
      // Method 3: Try direct words array
      if (positions.length === 0 && data.words && data.words.length > 0) {
        console.log(`DEBUG: Trying direct words approach - found ${data.words.length} words`);
        
        data.words.forEach((word, index) => {
          if (word.text && word.text.trim() && word.confidence > 10) {
            positions.push({
              text: word.text.trim(),
              page: pageNum,
              x: word.bbox.x0,
              y: word.bbox.y0,
              width: word.bbox.x1 - word.bbox.x0,
              height: word.bbox.y1 - word.bbox.y0,
              confidence: word.confidence,
              index: index,
              source: 'ocr'
            });
          }
        });
      }
      
      // Method 4: Try symbols (character level) - create synthetic words
      if (positions.length === 0 && data.symbols && data.symbols.length > 0) {
        console.log(`DEBUG: Trying symbols approach - found ${data.symbols.length} symbols`);
        
        // Group symbols into words by spatial proximity and whitespace
        let currentWord = '';
        let wordSymbols = [];
        let wordIndex = 0;
        
        for (let i = 0; i < data.symbols.length; i++) {
          const symbol = data.symbols[i];
          
          if (symbol.text && symbol.bbox) {
            const isWhitespace = /\s/.test(symbol.text);
            
            if (isWhitespace || i === data.symbols.length - 1) {
              // End of word - process accumulated symbols
              if (currentWord.trim() && wordSymbols.length > 0) {
                const firstSymbol = wordSymbols[0];
                const lastSymbol = wordSymbols[wordSymbols.length - 1];
                
                positions.push({
                  text: currentWord.trim(),
                  page: pageNum,
                  x: firstSymbol.bbox.x0,
                  y: firstSymbol.bbox.y0,
                  width: lastSymbol.bbox.x1 - firstSymbol.bbox.x0,
                  height: Math.max(...wordSymbols.map(s => s.bbox.y1)) - Math.min(...wordSymbols.map(s => s.bbox.y0)),
                  confidence: Math.round(wordSymbols.reduce((sum, s) => sum + s.confidence, 0) / wordSymbols.length),
                  index: wordIndex++,
                  source: 'ocr'
                });
              }
              
              // Reset for next word
              currentWord = '';
              wordSymbols = [];
            } else {
              // Add to current word
              currentWord += symbol.text;
              wordSymbols.push(symbol);
            }
          }
        }
      }
      
      // Method 5: FALLBACK - Create synthetic positions from text if we still have nothing
      if (positions.length === 0 && extractedText.trim()) {
        console.log(`DEBUG: Creating synthetic positions from text - ${extractedText.length} characters`);
        
        // Split text into words and create approximate positions
        const words = extractedText.split(/\s+/).filter(word => word.trim());
        const wordsPerLine = 10; // Rough estimate
        const lineHeight = 20;
        const charWidth = 8;
        
        words.forEach((word, index) => {
          const lineNum = Math.floor(index / wordsPerLine);
          const wordInLine = index % wordsPerLine;
          
          positions.push({
            text: word.trim(),
            page: pageNum,
            x: wordInLine * charWidth * 8, // Approximate x position
            y: lineNum * lineHeight + 50, // Approximate y position
            width: word.length * charWidth,
            height: lineHeight - 2,
            confidence: 75, // Synthetic confidence
            index: index,
            source: 'synthetic'
          });
        });
        
        console.log(`DEBUG: Created ${positions.length} synthetic positions`);
      }
      
      // Clean up canvas
      canvas.width = 0;
      canvas.height = 0;
      
      console.log(`DEBUG: Page ${pageNum} complete - ${extractedText.length} characters, ${positions.length} positions`);
      
      // Show sample positions for debugging
      if (positions.length > 0) {
        console.log(`DEBUG: Sample positions from page ${pageNum}:`);
        positions.slice(0, 5).forEach((pos, i) => {
          console.log(`  ${i + 1}. "${pos.text}" at (${Math.round(pos.x)}, ${Math.round(pos.y)}) confidence: ${pos.confidence}%`);
        });
      } else {
        console.log(`DEBUG: ⚠️ No positions extracted from page ${pageNum} - check OCR data structure`);
        
        // Debug: Log the structure of the OCR data
        console.log('DEBUG: OCR data structure:', {
          hasParagraphs: !!data.paragraphs,
          paragraphCount: data.paragraphs ? data.paragraphs.length : 0,
          hasWords: !!data.words,
          wordCount: data.words ? data.words.length : 0,
          hasSymbols: !!data.symbols,
          symbolCount: data.symbols ? data.symbols.length : 0,
          hasLines: !!data.lines,
          lineCount: data.lines ? data.lines.length : 0
        });
      }
      
      return {
        pageNum,
        text: extractedText,
        positions: positions,
        error: false
      };
      
    } catch (error) {
      console.error(`Error processing page ${pageNum}:`, error);
      return {
        pageNum,
        text: `Error processing page ${pageNum}: ${error.message}`,
        positions: [],
        error: true
      };
    }
  }
  
  /**
   * Create Tesseract workers with proper configuration
   */
  async createWorkers() {
    console.log(`Creating ${this.maxWorkers} Tesseract workers`);
    const workers = [];
    
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = await Tesseract.createWorker('eng', 1);
        
        // Configure worker for better word detection
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()-/@ ',
          preserve_interword_spaces: '1'
        });
        
        workers.push(worker);
        console.log(`Created worker ${i + 1}/${this.maxWorkers}`);
      } catch (error) {
        console.warn(`Failed to create worker ${i + 1}:`, error);
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