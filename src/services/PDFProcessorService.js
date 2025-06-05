// src/services/PDFProcessorService.js - Updated to use Azure OpenAI
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import ParallelPDFTextExtractionService from './ParallelPDFTextExtractionService';
import AzureOpenAIService from './AzureOpenAIService'; // Changed from OllamaService
import MedicalFieldService from './MedicalFieldService';

class PDFProcessorService {
  static instance;
  
  constructor() {
    this.documentsCache = new Map();
    this.textExtractionService = ParallelPDFTextExtractionService.getInstance();
    this.azureOpenAIService = AzureOpenAIService.getInstance(); // Changed from ollamaService
    this.medicalFieldService = MedicalFieldService.getInstance();
    this.isProcessing = false;
    this.progressCallback = null;
    
    // Store text positions for highlighting
    this.textPositions = new Map();
  }
  
  static getInstance() {
    if (!PDFProcessorService.instance) {
      PDFProcessorService.instance = new PDFProcessorService();
    }
    return PDFProcessorService.instance;
  }
  
  setProgressCallback(callback) {
    this.progressCallback = callback;
    this.textExtractionService.setProgressCallback(callback);
    this.azureOpenAIService.setProgressCallback(callback); // Changed from ollamaService
  }
  
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
   * UNIFIED EXPANSION VALUES - Single source of truth for highlighting expansion
   */
  getExpansionValues() {
    return {
      horizontalPadding: 1,
      verticalPadding: 1
    };
  }
  
  /**
   * UNIFORM BOUNDING BOX EXPANSION - Uses unified values
   */
  expandBoundingBox(position) {
    const { horizontalPadding, verticalPadding } = this.getExpansionValues();
    
    return {
      ...position,
      x: position.x - horizontalPadding,
      y: position.y - verticalPadding,
      width: position.width + (horizontalPadding * 2),
      height: position.height + (verticalPadding * 2)
    };
  }
  
  /**
   * Main document processing with highlighting support
   */
  async processDocument(uri, name) {
    try {
      if (this.isProcessing) {
        throw new Error('Another document is currently being processed');
      }
      
      this.isProcessing = true;
      console.log('Processing document:', name);
      
      this.updateProgress('processing', 0.01, 'Starting', 'Beginning document processing');
      
      const id = Date.now().toString();
      const date = new Date().toISOString().split('T')[0];
      
      // STEP 1: Extract text AND positions in single OCR run
      this.updateProgress('processing', 0.15, 'Text Extraction', 'Starting OCR processing with position capture');
      const extractionResult = await this.textExtractionService.extractText(uri);
      
      if (!extractionResult || (extractionResult.error && !extractionResult.text)) {
        this.isProcessing = false;
        const error = extractionResult?.error || 'Unknown error in text extraction';
        this.updateProgress('error', 0.2, 'Extraction Failed', `Error: ${error}`);
        throw new Error(`Text extraction failed: ${error}`);
      }
      
      const extractedText = extractionResult.text || '';
      
      this.updateProgress('processing', 0.3, 'Text Extracted', `Successfully processed ${extractionResult.pages} pages`);
      
      // STEP 2: Store positions for highlighting
      this.updateProgress('processing', 0.32, 'Context Mapping', 'Building contextual position map');
      
      const positions = this.textExtractionService.getLastExtractedPositions();
      this.textPositions.set(id, positions);
      
      if (positions.length > 0) {
        this.updateProgress('processing', 0.38, 'Context Mapping Complete', 
          `Built contextual map with ${positions.length} text positions`);
      } else {
        this.updateProgress('processing', 0.38, 'Context Mapping', 'No text positions found - highlighting disabled');
      }
      
      // STEP 3: AI processing using Azure OpenAI
      let formData = this.medicalFieldService.createEmptyFormData();
      
      if (extractedText) {
        try {
          this.updateProgress('processing', 0.4, 'AI Extraction', 'Starting Azure OpenAI information extraction');
          
          const extractedInfo = await this.azureOpenAIService.extractInformation(extractedText); // Changed from ollamaService
          
          this.updateProgress('processing', 0.8, 'AI Complete', 'Azure OpenAI extraction completed successfully');
          
          if (extractedInfo && extractedInfo.extractionMethod !== 'failed') {
            formData = { ...formData, ...extractedInfo };
            
            if (formData.patientName) {
              this.updateProgress('processing', 0.85, 'Patient Identified', `Found patient: ${formData.patientName}`);
            }
          } else {
            this.updateProgress('warning', 0.8, 'Extraction Issues', 'Azure OpenAI had trouble identifying information');
            formData.extractionMethod = 'failed';
            formData.error = extractedInfo?.error || 'Unknown error';
          }
        } catch (error) {
          this.updateProgress('warning', 0.5, 'AI Unavailable', `Could not connect to Azure OpenAI: ${error.message}`);
          formData.extractionMethod = 'unavailable';
          formData.error = `Azure OpenAI service unavailable: ${error.message}`;
        }
      } else {
        this.updateProgress('error', 0.4, 'No Text Found', 'No readable text was extracted');
        formData.extractionMethod = 'no_text';
        formData.error = 'No text was extracted from the document';
      }
      
      this.updateProgress('processing', 0.9, 'Processing Complete', 'Document processed successfully');
      
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
        hasHighlighting: positions.length > 0,
        positionSource: positions.length > 0 ? positions[0].source : 'none'
      };
      
      this.documentsCache.set(id, processedDocument);
      
      this.updateProgress('complete', 1.0, 'Complete', 'Document processed with contextual highlighting');
      this.isProcessing = false;
      return processedDocument;
    } catch (error) {
      this.isProcessing = false;
      this.updateProgress('error', 0.5, 'Processing Failed', `Error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * OPTIMIZED: Find contextual blocks - consolidated search strategies
   */
  findSourcePositions(documentId, fieldValue) {
    if (!fieldValue || !fieldValue.trim()) return [];
    
    const positions = this.textPositions.get(documentId) || [];
    if (positions.length === 0) return [];
    
    const searchText = fieldValue.toLowerCase().trim();
    
    // Try strategies in order of preference
    const strategies = [
      () => this.findMatches(positions, searchText, 'phrase'),
      () => this.findMatches(positions, searchText, 'sequence'),
      () => this.findMatches(positions, searchText, 'significant')
    ];
    
    for (const strategy of strategies) {
      const matches = strategy();
      if (matches.length > 0) {
        return matches.slice(0, 3).map(match => this.expandBoundingBox(match));
      }
    }
    
    return [];
  }
  
  /**
   * CONSOLIDATED: Single method for all match types
   */
  findMatches(positions, searchText, matchType) {
    const pageGroups = this.groupPositionsByPage(positions);
    const results = [];
    
    Object.entries(pageGroups).forEach(([page, pagePositions]) => {
      const pageNum = parseInt(page);
      pagePositions.sort(this.sortByReadingOrder);
      
      switch (matchType) {
        case 'phrase':
          results.push(...this.findPhraseMatchesOnPage(pagePositions, searchText, pageNum));
          break;
        case 'sequence':
          results.push(...this.findSequenceMatchesOnPage(pagePositions, searchText, pageNum));
          break;
        case 'significant':
          results.push(...this.findSignificantWordMatchesOnPage(pagePositions, searchText, pageNum));
          break;
      }
    });
    
    return this.removeDuplicateResults(results);
  }
  
  /**
   * HELPER: Group positions by page
   */
  groupPositionsByPage(positions) {
    const pageGroups = {};
    positions.forEach(pos => {
      if (!pageGroups[pos.page]) pageGroups[pos.page] = [];
      pageGroups[pos.page].push(pos);
    });
    return pageGroups;
  }
  
  /**
   * HELPER: Sort positions by reading order
   */
  sortByReadingOrder(a, b) {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) < 15) return a.x - b.x;
    return yDiff;
  }
  
  /**
   * Find phrase matches on a single page
   */
  findPhraseMatchesOnPage(pagePositions, searchText, pageNum) {
    const results = [];
    const windowSize = Math.min(50, pagePositions.length);
    
    for (let i = 0; i < pagePositions.length - 5; i++) {
      const textWindow = pagePositions.slice(i, i + windowSize);
      const windowText = textWindow.map(p => p.text).join(' ').toLowerCase();
      
      if (windowText.indexOf(searchText) !== -1) {
        const contextWords = this.getContextWords(pagePositions, i, 500);
        results.push(this.createMatchResult(contextWords, searchText, pageNum, 'phrase'));
      }
    }
    
    return results;
  }
  
  /**
   * Find sequence matches on a single page
   */
  findSequenceMatchesOnPage(pagePositions, searchText, pageNum) {
    const results = [];
    const significantWords = this.getSignificantWords(searchText);
    
    if (significantWords.length === 0) return results;
    
    pagePositions.forEach((currentPos, index) => {
      if (significantWords.includes(currentPos.text.toLowerCase())) {
        const nearbyWords = this.findNearbySignificantWords(pagePositions, currentPos, significantWords);
        
        if (nearbyWords.length >= 2) {
          const contextWords = this.getContextWords(pagePositions, index, 500);
          const highlightedText = nearbyWords.map(w => w.text).join(' ');
          results.push(this.createMatchResult(contextWords, highlightedText, pageNum, 'sequence'));
        }
      }
    });
    
    return results;
  }
  
  /**
   * Find significant word matches on a single page
   */
  findSignificantWordMatchesOnPage(pagePositions, searchText, pageNum) {
    const significantWords = this.getSignificantWords(searchText);
    if (significantWords.length === 0) return [];
    
    const matchingWords = this.findMatchingWords(pagePositions, significantWords);
    const contextualBlocks = this.buildContextualBlocks(matchingWords, pagePositions, pageNum);
    
    return contextualBlocks;
  }
  
  /**
   * HELPER: Get significant words (filter out common words)
   */
  getSignificantWords(searchText) {
    const commonWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must',
      'this', 'that', 'these', 'those', 'he', 'she', 'it', 'they', 'we', 'you',
      'not', 'no', 'yes', 'all', 'any', 'some', 'most', 'many', 'much', 'more'
    ];
    
    return searchText.split(' ')
      .filter(word => word.length > 2 && !commonWords.includes(word.toLowerCase()));
  }
  
  /**
   * HELPER: Find nearby significant words
   */
  findNearbySignificantWords(pagePositions, currentPos, significantWords) {
    return pagePositions.filter(pos => 
      Math.abs(pos.x - currentPos.x) < 800 &&
      Math.abs(pos.y - currentPos.y) < 100 &&
      significantWords.includes(pos.text.toLowerCase())
    ).sort(this.sortByReadingOrder);
  }
  
  /**
   * HELPER: Find matching words
   */
  findMatchingWords(pagePositions, significantWords) {
    const matchingWords = [];
    
    pagePositions.forEach(pos => {
      const posText = pos.text.toLowerCase();
      significantWords.forEach(word => {
        if (posText === word || posText.includes(word)) {
          matchingWords.push({
            ...pos,
            matchType: posText === word ? 'exact' : 'partial',
            matchScore: posText === word ? 100 : 80,
            searchWord: word
          });
        }
      });
    });
    
    return matchingWords;
  }
  
  /**
   * HELPER: Get context words around a position
   */
  getContextWords(pagePositions, centerIndex, radius) {
    const centerPos = pagePositions[centerIndex];
    
    return pagePositions.filter(pos => 
      Math.abs(pos.x - centerPos.x) < radius &&
      Math.abs(pos.y - centerPos.y) < 100
    ).sort(this.sortByReadingOrder);
  }
  
  /**
   * HELPER: Create match result object
   */
  createMatchResult(contextWords, searchText, pageNum, matchType) {
    const contextText = contextWords.map(p => p.text).join(' ');
    const boundingBox = this.calculateBoundingBox(contextWords);
    const confidence = this.calculateConfidence(contextWords);
    
    return {
      text: searchText,
      context: contextText,
      page: pageNum,
      x: boundingBox.x,
      y: boundingBox.y,
      width: boundingBox.width,
      height: boundingBox.height,
      confidence,
      matchType,
      highlightStart: contextText.toLowerCase().indexOf(searchText.toLowerCase()),
      highlightLength: searchText.length,
      source: contextWords[0]?.source || 'contextual',
      wordCount: contextWords.length
    };
  }
  
  /**
   * OPTIMIZED: Build contextual blocks with enhanced deduplication
   */
  buildContextualBlocks(matchingWords, allPositions, pageNum) {
    const CONTEXT_RADIUS_X = 200;
    const CONTEXT_RADIUS_Y = 50;
    const MIN_CONTEXT_WORDS = 5;
    const blocks = [];
    
    // Group matching words by proximity to avoid duplicate contexts
    const wordGroups = this.groupWordsByProximity(matchingWords, pageNum);
    
    wordGroups.forEach(wordGroup => {
      // Use the highest scoring word from each group as the anchor
      const anchorWord = wordGroup.reduce((best, current) => 
        current.matchScore > best.matchScore ? current : best
      );
      
      let contextWords = allPositions.filter(pos => 
        pos.page === pageNum &&
        Math.abs(pos.x - anchorWord.x) <= CONTEXT_RADIUS_X &&
        Math.abs(pos.y - anchorWord.y) <= CONTEXT_RADIUS_Y
      );
      
      // Expand search if needed
      if (contextWords.length < MIN_CONTEXT_WORDS) {
        contextWords = allPositions.filter(pos => 
          pos.page === pageNum &&
          Math.abs(pos.x - anchorWord.x) <= CONTEXT_RADIUS_X * 1.5 &&
          Math.abs(pos.y - anchorWord.y) <= CONTEXT_RADIUS_Y * 1.5
        );
      }
      
      if (contextWords.length >= MIN_CONTEXT_WORDS) {
        contextWords.sort(this.sortByReadingOrder);
        const uniqueWords = this.removeDuplicateWords(contextWords);
        
        blocks.push({
          text: anchorWord.text,
          context: uniqueWords.map(w => w.text).join(' '),
          page: pageNum,
          x: this.calculateBoundingBox(uniqueWords).x,
          y: this.calculateBoundingBox(uniqueWords).y,
          width: this.calculateBoundingBox(uniqueWords).width,
          height: this.calculateBoundingBox(uniqueWords).height,
          confidence: this.calculateConfidence(uniqueWords),
          matchType: anchorWord.matchType,
          highlightStart: 0,
          highlightLength: anchorWord.text.length,
          source: anchorWord.source,
          wordCount: uniqueWords.length
        });
      }
    });
    
    return this.removeDuplicateResults(blocks);
  }
  
  /**
   * Group words by spatial proximity to prevent duplicate contexts
   */
  groupWordsByProximity(words, pageNum) {
    const PROXIMITY_THRESHOLD = 100; // pixels
    const groups = [];
    const processed = new Set();
    
    words.forEach((word, index) => {
      if (processed.has(index)) return;
      
      const group = [word];
      processed.add(index);
      
      // Find nearby words
      words.forEach((otherWord, otherIndex) => {
        if (processed.has(otherIndex) || index === otherIndex) return;
        
        const distance = Math.sqrt(
          Math.pow(word.x - otherWord.x, 2) + 
          Math.pow(word.y - otherWord.y, 2)
        );
        
        if (distance <= PROXIMITY_THRESHOLD) {
          group.push(otherWord);
          processed.add(otherIndex);
        }
      });
      
      groups.push(group);
    });
    
    return groups;
  }
  
  /**
   * HELPER: Remove duplicate words
   */
  removeDuplicateWords(words) {
    return words.filter((word, index, arr) => 
      index === arr.findIndex(w => w.text === word.text && w.x === word.x && w.y === word.y)
    );
  }
  
  /**
   * HELPER: Calculate confidence from OCR results
   */
  calculateConfidence(words) {
    if (!words || words.length === 0) return 50;
    
    const validConfidences = words
      .map(w => w.confidence)
      .filter(c => c && c > 0 && c <= 100);
    
    if (validConfidences.length === 0) return 50;
    
    return Math.round(validConfidences.reduce((sum, c) => sum + c, 0) / validConfidences.length);
  }
  
  /**
   * HELPER: Calculate bounding box with expansion
   */
  calculateBoundingBox(words) {
    if (!words || words.length === 0) {
      return { x: 0, y: 0, width: 100, height: 20 };
    }
    
    const minX = Math.min(...words.map(w => w.x));
    const minY = Math.min(...words.map(w => w.y));
    const maxX = Math.max(...words.map(w => w.x + w.width));
    const maxY = Math.max(...words.map(w => w.y + w.height));
    
    const { horizontalPadding, verticalPadding } = this.getExpansionValues();
    
    return {
      x: minX - horizontalPadding,
      y: minY - verticalPadding,
      width: (maxX - minX) + (horizontalPadding * 2),
      height: (maxY - minY) + (verticalPadding * 2)
    };
  }
  
  /**
   * ENHANCED: Remove duplicate and overlapping results with better spatial awareness
   */
  removeDuplicateResults(results) {
    // First, sort by quality and position
    const sortedResults = results.sort((a, b) => {
      const typeOrder = { phrase: 0, sequence: 1, exact: 2, partial: 3 };
      const aOrder = typeOrder[a.matchType] || 4;
      const bOrder = typeOrder[b.matchType] || 4;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      if (a.page !== b.page) return a.page - b.page;
      if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
      return a.x - b.x;
    });
    
    // Remove overlapping results with improved spatial logic
    const filteredResults = [];
    
    for (const result of sortedResults) {
      const isOverlapping = filteredResults.some(existing => {
        // Must be on same page
        if (existing.page !== result.page) return false;
        
        // Check for significant spatial overlap
        const horizontalOverlap = this.calculateOverlap(
          existing.x, existing.x + existing.width,
          result.x, result.x + result.width
        );
        
        const verticalOverlap = this.calculateOverlap(
          existing.y, existing.y + existing.height,
          result.y, result.y + result.height
        );
        
        // Consider overlapping if there's significant overlap in both dimensions
        const significantHorizontalOverlap = horizontalOverlap > Math.min(existing.width, result.width) * 0.6;
        const significantVerticalOverlap = verticalOverlap > Math.min(existing.height, result.height) * 0.4;
        
        return significantHorizontalOverlap && significantVerticalOverlap;
      });
      
      if (!isOverlapping) {
        filteredResults.push(result);
      }
    }
    
    // Additional filter for very close results (safety net)
    return this.filterVeryCloseResults(filteredResults);
  }
  
  /**
   * Calculate overlap between two ranges
   */
  calculateOverlap(start1, end1, start2, end2) {
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    return Math.max(0, overlapEnd - overlapStart);
  }
  
  /**
   * Filter out results that are extremely close to each other
   */
  filterVeryCloseResults(results) {
    const CLOSE_DISTANCE_THRESHOLD = 30; // pixels
    
    return results.filter((result, index) => {
      return !results.slice(0, index).some(prevResult => {
        if (prevResult.page !== result.page) return false;
        
        // Calculate center points
        const prevCenterX = prevResult.x + prevResult.width / 2;
        const prevCenterY = prevResult.y + prevResult.height / 2;
        const currCenterX = result.x + result.width / 2;
        const currCenterY = result.y + result.height / 2;
        
        // Calculate distance between centers
        const distance = Math.sqrt(
          Math.pow(prevCenterX - currCenterX, 2) + 
          Math.pow(prevCenterY - currCenterY, 2)
        );
        
        return distance < CLOSE_DISTANCE_THRESHOLD;
      });
    });
  }
  
  /**
   * Get field reference with contextual source positions
   */
  getFieldReference(documentId, fieldKey) {
    const document = this.documentsCache.get(documentId);
    if (!document || !document.formData) return null;
    
    const fieldValue = document.formData[fieldKey];
    if (!fieldValue) return null;
    
    const sourcePositions = this.findSourcePositions(documentId, fieldValue);
    
    return {
      extractedValue: fieldValue,
      explanation: sourcePositions.length > 0 ? 
        `Found "${fieldValue}" in ${sourcePositions.length} contextual location(s) with generous highlighting.` :
        `Azure OpenAI extracted this information from the document text.`,
      confidence: 'Azure OpenAI Generated',
      timestamp: document.formData.extractionDate,
      sourcePositions: sourcePositions,
      hasSourceHighlighting: sourcePositions.length > 0
    };
  }
  
  // Existing utility methods
  cancelProcessing() {
    if (this.isProcessing) {
      this.textExtractionService.cancel();
      this.isProcessing = false;
    }
  }
  
  async getProcessedDocuments() {
    return Array.from(this.documentsCache.values());
  }
  
  async getDocumentById(id) {
    return this.documentsCache.get(id) || null;
  }
  
  async deleteDocument(id) {
    if (this.documentsCache.has(id)) {
      const document = this.documentsCache.get(id);
      const uri = document?.uri;
      
      this.textPositions.delete(id);
      this.documentsCache.delete(id);
      
      if (Platform.OS !== 'web' && uri && uri.startsWith(FileSystem.documentDirectory)) {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (e) {
          console.warn('Failed to delete document file:', e);
        }
      } else if (Platform.OS === 'web' && uri && uri.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(uri);
        } catch (e) {
          console.warn('Failed to revoke blob URL:', e);
        }
      }
      
      return true;
    }
    
    return false;
  }
}

export default PDFProcessorService;