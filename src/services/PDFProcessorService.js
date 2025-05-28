// src/services/PDFProcessorService.js - Complete fixed version with proper context and expansion
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import ParallelPDFTextExtractionService from './ParallelPDFTextExtractionService';
import OllamaService from './OllamaService';
import MedicalFieldService from './MedicalFieldService';

class PDFProcessorService {
  static instance;
  
  constructor() {
    this.documentsCache = new Map();
    this.textExtractionService = ParallelPDFTextExtractionService.getInstance();
    this.ollamaService = OllamaService.getInstance();
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
    this.ollamaService.setProgressCallback(callback);
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
   * UNIFIED EXPANSION VALUES - Change these to adjust ALL highlighting
   */
  getExpansionValues() {
    return {
      horizontalPadding: 25, // 🎯 CHANGE THIS to adjust width of ALL highlights
      verticalPadding: 15    // 🎯 CHANGE THIS to adjust height of ALL highlights
    };
  }
  
  /**
   * UNIFORM BOUNDING BOX EXPANSION - Uses unified values
   */
  expandBoundingBox(position) {
    const { horizontalPadding, verticalPadding } = this.getExpansionValues();
    
    return {
      ...position, // Keep all original data
      x: position.x - horizontalPadding,
      y: position.y - verticalPadding,
      width: position.width + (horizontalPadding * 2),
      height: position.height + (verticalPadding * 2)
    };
  }
  
  /**
   * Main processing using OCR positions from extraction service
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
      
      // STEP 2: Get positions from OCR service
      this.updateProgress('processing', 0.32, 'Context Mapping', 'Building contextual position map');
      
      console.log('DEBUG: Getting positions from OCR extraction service...');
      const positions = this.textExtractionService.getLastExtractedPositions();
      console.log(`DEBUG: Retrieved ${positions.length} positions from OCR service`);
      
      // Store positions for highlighting
      this.textPositions.set(id, positions);
      
      if (positions.length > 0) {
        this.updateProgress('processing', 0.38, 'Context Mapping Complete', 
          `Built contextual map with ${positions.length} text positions`);
        
        // Show sample positions
        console.log('DEBUG: Sample OCR positions retrieved:');
        positions.slice(0, 5).forEach((pos, i) => {
          console.log(`  ${i + 1}. "${pos.text}" at (${Math.round(pos.x)}, ${Math.round(pos.y)}) [${pos.source}]`);
        });
      } else {
        this.updateProgress('processing', 0.38, 'Context Mapping', 'No text positions found - highlighting disabled');
        console.log('DEBUG: ⚠️ No positions retrieved from OCR service');
      }
      
      // STEP 3: AI processing (existing code)
      let formData = this.medicalFieldService.createEmptyFormData();
      
      if (extractedText) {
        try {
          this.updateProgress('processing', 0.4, 'AI Extraction', 'Starting AI information extraction');
          
          const extractedInfo = await this.ollamaService.extractInformation(extractedText);
          
          this.updateProgress('processing', 0.8, 'AI Complete', 'AI extraction completed successfully');
          
          if (extractedInfo && extractedInfo.extractionMethod !== 'failed') {
            console.log('AI extraction successful');
            formData = { ...formData, ...extractedInfo };
            
            if (formData.patientName) {
              this.updateProgress('processing', 0.85, 'Patient Identified', `Found patient: ${formData.patientName}`);
            }
          } else {
            console.error('AI extraction failed:', extractedInfo?.error || 'Unknown error');
            this.updateProgress('warning', 0.8, 'Extraction Issues', 'AI had trouble identifying information');
            formData.extractionMethod = 'failed';
            formData.error = extractedInfo?.error || 'Unknown error';
          }
        } catch (error) {
          console.error('Error in AI extraction:', error);
          this.updateProgress('warning', 0.5, 'AI Unavailable', `Could not connect to AI: ${error.message}`);
          formData.extractionMethod = 'unavailable';
          formData.error = `AI service unavailable: ${error.message}`;
        }
      } else {
        console.error('No text was extracted from the document');
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
      
      console.log(`Document processed successfully: ${id} (${positions.length} positions for contextual highlighting using ${processedDocument.positionSource})`);
      this.updateProgress('complete', 1.0, 'Complete', 'Document processed with contextual highlighting');
      this.isProcessing = false;
      return processedDocument;
    } catch (error) {
      this.isProcessing = false;
      console.error('Error processing document:', error);
      this.updateProgress('error', 0.5, 'Processing Failed', `Error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * FIXED: Find contextual blocks with uniform expansion applied
   */
  findSourcePositions(documentId, fieldValue) {
    console.log(`DEBUG: 🔍 Looking for contextual blocks for: "${fieldValue}"`);
    
    if (!fieldValue || !fieldValue.trim()) {
      console.log('DEBUG: No field value provided');
      return [];
    }
    
    const positions = this.textPositions.get(documentId) || [];
    console.log(`DEBUG: Have ${positions.length} total positions to search in document ${documentId}`);
    
    if (positions.length === 0) {
      console.log('DEBUG: ❌ No positions stored for this document');
      return [];
    }
    
    const searchText = fieldValue.toLowerCase().trim();
    
    // STRATEGY 1: Try to find complete phrases first (most important)
    console.log(`DEBUG: Strategy 1 - Looking for complete phrases matching: "${searchText}"`);
    let phraseMatches = this.findPhraseMatches(positions, searchText);
    
    if (phraseMatches.length > 0) {
      console.log(`DEBUG: ✅ Found ${phraseMatches.length} phrase matches - applying uniform expansion`);
      return phraseMatches.slice(0, 3).map(match => this.expandBoundingBox(match));
    }
    
    // STRATEGY 2: Find meaningful word sequences (fallback)
    console.log(`DEBUG: Strategy 2 - Looking for meaningful word sequences`);
    let sequenceMatches = this.findSequenceMatches(positions, searchText);
    
    if (sequenceMatches.length > 0) {
      console.log(`DEBUG: ✅ Found ${sequenceMatches.length} sequence matches - applying uniform expansion`);
      return sequenceMatches.slice(0, 3).map(match => this.expandBoundingBox(match));
    }
    
    // STRATEGY 3: Find significant words only (skip common words)
    console.log(`DEBUG: Strategy 3 - Looking for significant word matches (filtering common words)`);
    let significantMatches = this.findSignificantWordMatches(positions, searchText);
    
    console.log(`DEBUG: 🎯 Final result: Found ${significantMatches.length} contextual blocks for "${fieldValue}"`);
    
    // Apply uniform expansion to all results
    const expandedMatches = significantMatches.slice(0, 3).map(match => this.expandBoundingBox(match));
    
    if (expandedMatches.length > 0) {
      console.log(`DEBUG: 📦 Applied uniform expansion (+25px horizontal, +15px vertical) to ${expandedMatches.length} matches`);
      expandedMatches.forEach((match, i) => {
        console.log(`  ${i + 1}. "${match.text}" expanded to (${Math.round(match.x)}, ${Math.round(match.y)}) ${Math.round(match.width)}x${Math.round(match.height)}`);
      });
    }
    
    return expandedMatches;
  }
  
  /**
   * Find complete phrase matches in document - WITH MORE CONTEXT
   */
  findPhraseMatches(positions, searchText) {
    const results = [];
    const CONTEXT_RADIUS = 500; // 🔧 INCREASED from 150 to 500 for more context
    
    // Group positions by page and sort by reading order
    const pageGroups = {};
    positions.forEach(pos => {
      if (!pageGroups[pos.page]) pageGroups[pos.page] = [];
      pageGroups[pos.page].push(pos);
    });
    
    Object.entries(pageGroups).forEach(([page, pagePositions]) => {
      const pageNum = parseInt(page);
      
      // Sort by reading order
      pagePositions.sort((a, b) => {
        const yDiff = a.y - b.y;
        if (Math.abs(yDiff) < 15) return a.x - b.x;
        return yDiff;
      });
      
      // Build text sequences and look for phrase matches
      for (let i = 0; i < pagePositions.length - 5; i++) {
        const windowSize = Math.min(50, pagePositions.length - i); // 🔧 INCREASED from 20 to 50 words
        const textWindow = pagePositions.slice(i, i + windowSize);
        const windowText = textWindow.map(p => p.text).join(' ').toLowerCase();
        
        // Check if our search phrase appears in this window
        const phraseIndex = windowText.indexOf(searchText);
        if (phraseIndex !== -1) {
          // Found the phrase! Build context around it
          const contextWords = this.getContextAroundPosition(pagePositions, i, CONTEXT_RADIUS);
          const contextText = contextWords.map(p => p.text).join(' ');
          
          // Calculate bounding box
          const boundingBox = this.calculateBoundingBox(contextWords);
          
          // Calculate actual confidence from the words
          const actualConfidence = this.calculateActualConfidence(textWindow);
          
          results.push({
            text: searchText,
            context: contextText,
            page: pageNum,
            x: boundingBox.x,
            y: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height,
            confidence: actualConfidence,
            matchType: 'phrase',
            highlightStart: contextText.toLowerCase().indexOf(searchText),
            highlightLength: searchText.length,
            source: textWindow[0]?.source || 'contextual',
            wordCount: contextWords.length
          });
          
          console.log(`DEBUG: ✅ Found phrase match on page ${pageNum}: "${searchText}"`);
          console.log(`DEBUG: Context (${contextWords.length} words): "${contextText.substring(0, 150)}..."`);
        }
      }
    });
    
    return results;
  }
  
  /**
   * Find meaningful word sequences - WITH MORE CONTEXT
   */
  findSequenceMatches(positions, searchText) {
    const results = [];
    const searchWords = searchText.split(' ').filter(word => word.length > 2);
    const significantWords = searchWords.filter(word => !this.isCommonWord(word));
    
    if (significantWords.length === 0) {
      console.log('DEBUG: No significant words found in search text');
      return [];
    }
    
    console.log(`DEBUG: Looking for sequences with significant words: [${significantWords.join(', ')}]`);
    
    // Group positions by page
    const pageGroups = {};
    positions.forEach(pos => {
      if (!pageGroups[pos.page]) pageGroups[pos.page] = [];
      pageGroups[pos.page].push(pos);
    });
    
    Object.entries(pageGroups).forEach(([page, pagePositions]) => {
      const pageNum = parseInt(page);
      
      // Find sequences where multiple significant words appear close together
      for (let i = 0; i < pagePositions.length; i++) {
        const currentPos = pagePositions[i];
        const currentWord = currentPos.text.toLowerCase();
        
        // Check if this is one of our significant words
        if (significantWords.includes(currentWord)) {
          // Look for other significant words nearby - INCREASED search area
          const nearbyWords = pagePositions.filter(pos => 
            Math.abs(pos.x - currentPos.x) < 800 && // 🔧 INCREASED from 300 to 800
            Math.abs(pos.y - currentPos.y) < 100 && // 🔧 INCREASED from 30 to 100
            significantWords.includes(pos.text.toLowerCase())
          ).sort((a, b) => {
            const yDiff = a.y - b.y;
            if (Math.abs(yDiff) < 10) return a.x - b.x;
            return yDiff;
          });
          
          if (nearbyWords.length >= 2) { // Found at least 2 significant words together
            const contextWords = this.getContextAroundPosition(
              pagePositions, 
              pagePositions.indexOf(currentPos), 
              500 // 🔧 INCREASED from 200 to 500 for more context
            );
            const contextText = contextWords.map(p => p.text).join(' ');
            const boundingBox = this.calculateBoundingBox(contextWords);
            const actualConfidence = this.calculateActualConfidence(nearbyWords);
            
            // Create highlighted text from the significant words found
            const highlightedText = nearbyWords.map(w => w.text).join(' ');
            
            results.push({
              text: highlightedText,
              context: contextText,
              page: pageNum,
              x: boundingBox.x,
              y: boundingBox.y,
              width: boundingBox.width,
              height: boundingBox.height,
              confidence: actualConfidence,
              matchType: 'sequence',
              highlightStart: contextText.toLowerCase().indexOf(highlightedText.toLowerCase()),
              highlightLength: highlightedText.length,
              source: currentPos.source || 'contextual',
              wordCount: contextWords.length
            });
            
            console.log(`DEBUG: ✅ Found sequence match with ${contextWords.length} context words: "${highlightedText}"`);
          }
        }
      }
    });
    
    // Remove duplicates and sort by quality
    return this.removeDuplicateResults(results);
  }
  
  /**
   * Find significant individual words (filtering out common words)
   */
  findSignificantWordMatches(positions, searchText) {
    const results = [];
    const searchWords = searchText.split(' ').filter(word => word.length > 2);
    const significantWords = searchWords.filter(word => !this.isCommonWord(word));
    
    if (significantWords.length === 0) {
      console.log('DEBUG: No significant words to search for');
      return [];
    }
    
    console.log(`DEBUG: Looking for significant words: [${significantWords.join(', ')}]`);
    
    const matchingWords = [];
    positions.forEach(pos => {
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
    
    console.log(`DEBUG: Found ${matchingWords.length} significant word matches`);
    
    // Build contextual blocks from significant matches
    const contextualBlocks = this.buildContextualBlocks(matchingWords, positions);
    
    return contextualBlocks.map(block => ({
      text: block.highlightedText,
      context: block.contextText,
      page: block.page,
      x: block.boundingBox.x,
      y: block.boundingBox.y,
      width: block.boundingBox.width,
      height: block.boundingBox.height,
      confidence: Math.round(block.averageConfidence),
      matchType: block.matchType,
      highlightStart: block.highlightStart,
      highlightLength: block.highlightLength,
      source: block.source || 'contextual',
      wordCount: block.wordCount
    }));
  }
  
  /**
   * FIXED: Build contextual blocks with reasonable context radius
   */
  buildContextualBlocks(matchingWords, allPositions) {
    // 🔧 FIXED: Reasonable context radius instead of massive values
    const CONTEXT_RADIUS_X = 200; // REDUCED from 2000 to 200 pixels horizontal
    const CONTEXT_RADIUS_Y = 50;  // REDUCED from 400 to 50 pixels vertical  
    const MIN_CONTEXT_WORDS = 5;  // REDUCED from 20 to 5 minimum words for context
    
    const blocks = [];
    
    // Group matching words by page
    const pageGroups = {};
    matchingWords.forEach(word => {
      if (!pageGroups[word.page]) pageGroups[word.page] = [];
      pageGroups[word.page].push(word);
    });
    
    Object.entries(pageGroups).forEach(([page, words]) => {
      const pageNum = parseInt(page);
      
      // For each matching word, build a reasonable context block
      words.forEach(matchWord => {
        // Find all words within REASONABLE spatial proximity
        const contextWords = allPositions.filter(pos => 
          pos.page === pageNum &&
          Math.abs(pos.x - matchWord.x) <= CONTEXT_RADIUS_X &&
          Math.abs(pos.y - matchWord.y) <= CONTEXT_RADIUS_Y
        );
        
        if (contextWords.length < MIN_CONTEXT_WORDS) {
          // Expand search if we don't have enough context
          const expandedWords = allPositions.filter(pos => 
            pos.page === pageNum &&
            Math.abs(pos.x - matchWord.x) <= CONTEXT_RADIUS_X * 1.5 &&
            Math.abs(pos.y - matchWord.y) <= CONTEXT_RADIUS_Y * 1.5
          );
          
          if (expandedWords.length >= MIN_CONTEXT_WORDS) {
            contextWords.push(...expandedWords);
          }
        }
        
        // Sort words by reading order (Y then X)
        contextWords.sort((a, b) => {
          const yDiff = a.y - b.y;
          if (Math.abs(yDiff) < 15) { // Same line
            return a.x - b.x;
          }
          return yDiff;
        });
        
        // Remove duplicates
        const uniqueWords = contextWords.filter((word, index, arr) => 
          index === arr.findIndex(w => w.text === word.text && w.x === word.x && w.y === word.y)
        );
        
        if (uniqueWords.length >= MIN_CONTEXT_WORDS) {
          // Build contextual text
          const contextText = uniqueWords.map(w => w.text).join(' ');
          
          // Find the highlighted portion
          const highlightedText = matchWord.text;
          const highlightStart = contextText.toLowerCase().indexOf(matchWord.text.toLowerCase());
          
          // Calculate bounding box WITH EXPANSION
          const { horizontalPadding, verticalPadding } = this.getExpansionValues();
          const boundingBox = {
            x: Math.min(...uniqueWords.map(w => w.x)) - horizontalPadding,
            y: Math.min(...uniqueWords.map(w => w.y)) - verticalPadding,
            width: (Math.max(...uniqueWords.map(w => w.x + w.width)) - Math.min(...uniqueWords.map(w => w.x))) + (horizontalPadding * 2),
            height: (Math.max(...uniqueWords.map(w => w.y + w.height)) - Math.min(...uniqueWords.map(w => w.y))) + (verticalPadding * 2)
          };
          
          // Calculate average confidence
          const averageConfidence = uniqueWords.reduce((sum, w) => sum + (w.confidence || 75), 0) / uniqueWords.length;
          
          blocks.push({
            contextText: contextText.trim(),
            highlightedText: highlightedText,
            highlightStart: Math.max(0, highlightStart),
            highlightLength: highlightedText.length,
            page: pageNum,
            boundingBox,
            averageConfidence,
            matchType: matchWord.matchType,
            source: matchWord.source,
            wordCount: uniqueWords.length
          });
          
          console.log(`DEBUG: ✅ Built reasonable contextual block: "${highlightedText}" with ${uniqueWords.length} context words`);
        }
      });
    });
    
    // Remove duplicate blocks (same page, similar position)
    const uniqueBlocks = blocks.filter((block, index) => {
      return !blocks.slice(0, index).some(prevBlock => 
        prevBlock.page === block.page &&
        Math.abs(prevBlock.boundingBox.x - block.boundingBox.x) < 50 &&
        Math.abs(prevBlock.boundingBox.y - block.boundingBox.y) < 20
      );
    });
    
    // Sort by match quality and position
    uniqueBlocks.sort((a, b) => {
      // Prefer exact matches
      if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
      if (b.matchType === 'exact' && a.matchType !== 'exact') return 1;
      
      // Then by page order
      if (a.page !== b.page) return a.page - b.page;
      
      // Then by position on page
      return a.boundingBox.y - b.boundingBox.y;
    });
    
    return uniqueBlocks;
  }
  
  /**
   * Check if a word is too common to be useful for matching
   */
  isCommonWord(word) {
    const commonWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must',
      'this', 'that', 'these', 'those', 'he', 'she', 'it', 'they', 'we', 'you',
      'his', 'her', 'its', 'their', 'our', 'your', 'my', 'me', 'him', 'them', 'us',
      'not', 'no', 'yes', 'all', 'any', 'some', 'most', 'many', 'much', 'more',
      'very', 'so', 'too', 'also', 'only', 'just', 'now', 'then', 'here', 'there'
    ];
    return commonWords.includes(word.toLowerCase());
  }
  
  /**
   * Get context words around a specific position - WITH MORE CONTEXT
   */
  getContextAroundPosition(pagePositions, centerIndex, radius) {
    const centerPos = pagePositions[centerIndex];
    
    return pagePositions.filter(pos => 
      Math.abs(pos.x - centerPos.x) < radius &&
      Math.abs(pos.y - centerPos.y) < 100 // 🔧 INCREASED from 40 to 100 for more vertical context
    ).sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) < 15) return a.x - b.x;
      return yDiff;
    });
  }
  
  /**
   * Calculate actual confidence from OCR results
   */
  calculateActualConfidence(words) {
    if (!words || words.length === 0) return 50;
    
    const validConfidences = words
      .map(w => w.confidence)
      .filter(c => c && c > 0 && c <= 100);
    
    if (validConfidences.length === 0) return 50;
    
    return Math.round(validConfidences.reduce((sum, c) => sum + c, 0) / validConfidences.length);
  }
  
  /**
   * Calculate bounding box for a group of words WITH EXPANSION APPLIED
   */
  calculateBoundingBox(words) {
    if (!words || words.length === 0) {
      return { x: 0, y: 0, width: 100, height: 20 };
    }
    
    const minX = Math.min(...words.map(w => w.x));
    const minY = Math.min(...words.map(w => w.y));
    const maxX = Math.max(...words.map(w => w.x + w.width));
    const maxY = Math.max(...words.map(w => w.y + w.height));
    
    // 🎯 APPLY EXPANSION HERE TOO - so phrase/sequence matches also get expanded
    const { horizontalPadding, verticalPadding } = this.getExpansionValues();
    
    return {
      x: minX - horizontalPadding,
      y: minY - verticalPadding,
      width: (maxX - minX) + (horizontalPadding * 2),
      height: (maxY - minY) + (verticalPadding * 2)
    };
  }
  
  /**
   * Remove duplicate results that are too similar
   */
  removeDuplicateResults(results) {
    return results.filter((result, index) => {
      return !results.slice(0, index).some(prevResult => 
        prevResult.page === result.page &&
        Math.abs(prevResult.x - result.x) < 50 &&
        Math.abs(prevResult.y - result.y) < 20
      );
    }).sort((a, b) => {
      // Sort by match type priority, then by page
      const typeOrder = { phrase: 0, sequence: 1, exact: 2, partial: 3 };
      const aOrder = typeOrder[a.matchType] || 4;
      const bOrder = typeOrder[b.matchType] || 4;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      if (a.page !== b.page) return a.page - b.page;
      return a.y - b.y;
    });
  }
  
  /**
   * Get field reference with contextual source positions
   */
  getFieldReference(documentId, fieldKey) {
    const document = this.documentsCache.get(documentId);
    if (!document || !document.formData) {
      return null;
    }
    
    const fieldValue = document.formData[fieldKey];
    if (!fieldValue) {
      return null;
    }
    
    // Find contextual source positions with uniform expansion
    const sourcePositions = this.findSourcePositions(documentId, fieldValue);
    
    return {
      extractedValue: fieldValue,
      explanation: sourcePositions.length > 0 ? 
        `Found "${fieldValue}" in ${sourcePositions.length} contextual location(s) with generous highlighting.` :
        `AI extracted this information from the document text.`,
      confidence: 'AI Generated',
      timestamp: document.formData.extractionDate,
      sourcePositions: sourcePositions,
      hasSourceHighlighting: sourcePositions.length > 0
    };
  }
  
  // Keep all existing methods unchanged
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