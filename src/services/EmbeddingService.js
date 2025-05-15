
/**
 * EmbeddingService.js - Specialized service for generating and managing text embeddings
 * This service uses Ollama to generate embeddings with dedicated embedding models
 */
import { Platform } from 'react-native';
import SectionType from '../constants/SectionTypes';

class EmbeddingService {
  static instance;

  constructor() {
    this.baseUrl = 'http://localhost:11434';
    
    // Primary embedding model - optimized for semantic search and context matching
    this.embeddingModel = 'nomic-embed-text';
    
    // Alternative models if the primary one isn't available
    this.fallbackModels = ['all-minilm', 'e5-small', 'mxbai-embed-large'];
    
    // Cache for document embeddings to avoid redundant computation
    this.embeddingCache = new Map();
    
    // Last used embedding model (for cache invalidation when model changes)
    this.lastUsedModel = null;
    
    // Track initialization status
    this.initialized = false;
  }

  static getInstance() {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Set the base URL for the Ollama API
   */
  setBaseUrl(url) {
    this.baseUrl = url.trim();
    console.log('Embedding service: Ollama base URL set to:', this.baseUrl);
    
    // Invalidate cache when URL changes
    this.clearCache();
  }

  /**
   * Set the embedding model to use
   */
  setEmbeddingModel(model) {
    if (model && model.trim()) {
      const newModel = model.trim();
      if (newModel !== this.embeddingModel) {
        this.embeddingModel = newModel;
        console.log('Embedding model set to:', this.embeddingModel);
        
        // Invalidate cache when model changes
        this.clearCache();
      }
    }
  }

  /**
   * Clear the embedding cache
   */
  clearCache() {
    this.embeddingCache.clear();
    console.log('Embedding cache cleared');
  }

  /**
   * Get the current configuration
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      embeddingModel: this.embeddingModel
    };
  }

  /**
   * Initialize the service by checking for available embedding models
   */
  async initialize() {
    console.log('Initializing EmbeddingService...');
    
    // Skip if already initialized
    if (this.initialized) {
      console.log('EmbeddingService already initialized');
      return true;
    }
    
    try {
      // Test connection to Ollama server
      const isConnected = await this.testConnection();
      if (!isConnected) {
        console.error('Embedding service: Ollama server not available');
        return false;
      }
      
      // Check if the preferred embedding model exists
      try {
        console.log(`Checking if embedding model ${this.embeddingModel} exists...`);
        const response = await fetch(`${this.baseUrl}/api/show`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: this.embeddingModel }),
        });
        
        if (response.ok) {
          console.log(`Confirmed embedding model ${this.embeddingModel} is available`);
          this.initialized = true;
          this.lastUsedModel = this.embeddingModel;
          return true;
        } else {
          console.warn(`Embedding model ${this.embeddingModel} not found, checking alternatives...`);
        }
      } catch (error) {
        console.warn(`Error checking embedding model:`, error);
      }
      
      // If preferred model not found, try to get all available models
      const models = await this.getAvailableModels();
      console.log('Available models for embeddings:', models);
      
      if (models && models.length > 0) {
        // Try our fallback embedding models
        for (const model of [this.embeddingModel, ...this.fallbackModels]) {
          if (models.includes(model)) {
            this.embeddingModel = model;
            console.log(`Using embedding model: ${this.embeddingModel}`);
            this.initialized = true;
            this.lastUsedModel = this.embeddingModel;
            return true;
          }
        }
        
        // If no embedding model found, use the first available model
        this.embeddingModel = models[0];
        console.log(`Using alternative model for embeddings: ${this.embeddingModel}`);
        this.initialized = true;
        this.lastUsedModel = this.embeddingModel;
        return true;
      }
      
      console.error('No models available for embeddings');
      return false;
    } catch (error) {
      console.error('Error initializing EmbeddingService:', error);
      return false;
    }
  }

  /**
   * Test the connection to the Ollama server
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      return response.ok;
    } catch (error) {
      console.error('Embedding service: Ollama connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle different response formats from different Ollama versions
      if (data.models) {
        return data.models.map(model => model.name || model);
      } else if (Array.isArray(data)) {
        return data.map(model => model.name || model);
      } else if (typeof data === 'object' && data !== null) {
        return Object.keys(data).filter(key => 
          typeof data[key] === 'object' && data[key] !== null
        );
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get available models for embeddings:', error);
      return [];
    }
  }

  /**
   * Preprocess medical text for better embeddings
   * @param {string} text - Original text
   * @returns {string} - Processed text
   */
  preprocessMedicalText(text) {
    // Limit text length for embeddings
    const maxLength = 8192;  // Most embedding models have context limits
    let processedText = text.length > maxLength ? text.substring(0, maxLength) : text;
    
    // For specialized embedding models, less processing often works better
    if (this.embeddingModel === 'nomic-embed-text' || 
        this.embeddingModel === 'all-minilm') {
      // Just clean the text without adding markers
      return processedText.trim();
    }
    
    // For other models, enhance with medical context markers
    const medicalTerms = {
      'patient': '[PATIENT]',
      'name:': '[PATIENT_NAME]',
      'dob': '[DATE_OF_BIRTH]',
      'diagnosis': '[DIAGNOSIS]',
      'assessment': '[DIAGNOSIS]',
      'impression': '[DIAGNOSIS]',
      'medication': '[MEDICATION]',
      'lab': '[LAB_RESULT]',
      'test': '[TEST]',
      'doctor': '[PROVIDER]',
      'physician': '[PROVIDER]',
      'hospital': '[LOCATION]',
      'insurance': '[INSURANCE]',
      'allergies': '[ALLERGIES]',
      'history': '[HISTORY]'
    };
    
    // Add medical context markers
    Object.entries(medicalTerms).forEach(([term, marker]) => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      processedText = processedText.replace(regex, `${marker}${term}`);
    });
    
    return processedText;
  }

  /**
   * Get embedding for a text, using cache if available
   * @param {string} text - Text to embed
   * @param {string} model - Optional specific model to use
   * @returns {Promise<Array>} - Embedding vector
   */
  async getEmbedding(text, model = null) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.warn('Empty text provided for embedding');
      return this.generateRandomEmbeddings();
    }
    
    // Use service default if no model specified
    if (!model) {
      model = this.embeddingModel;
    }
    
    // Create a cache key from text and model
    const cacheKey = `${model}:${text.substring(0, 100)}:${text.length}`;
    
    // Check if we have this embedding in cache
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey);
    }
    
    // Not in cache, generate new embedding
    try {
      const embedding = await this.generateEmbeddings(text, model);
      
      // Store in cache
      this.embeddingCache.set(cacheKey, embedding);
      
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return this.generateRandomEmbeddings();
    }
  }

  /**
   * Generate embeddings for text
   * @param {string} text - The text to generate embeddings for
   * @param {string} model - The model to use
   * @returns {Promise<Array>} - Array of embedding values
   */
  async generateEmbeddings(text, model = null) {
    // Ensure service is initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Use service default if no model specified
    if (!model) {
      model = this.embeddingModel;
    }
    
    // Preprocess text for embeddings
    const processedText = this.preprocessMedicalText(text);
    
    console.log(`Generating embeddings with model: ${model}`);
    console.log(`Text length for embeddings: ${processedText.length} characters`);
    
    try {
      // Try the primary embedding endpoint
      const embeddings = await this.callEmbeddingsEndpoint(processedText, model);
      this.lastUsedModel = model;
      return embeddings;
    } catch (error) {
      console.error('Primary embeddings endpoint failed:', error);
      
      try {
        // Try the alternate endpoint format
        const embeddings = await this.callEmbedAlternateEndpoint(processedText, model);
        this.lastUsedModel = model;
        return embeddings;
      } catch (alternateError) {
        console.error('Alternative embeddings approach also failed:', alternateError);
        return this.generateRandomEmbeddings();
      }
    }
  }

  /**
   * Call the primary Ollama embeddings endpoint
   */
  async callEmbeddingsEndpoint(text, model) {
    const requestData = {
      model,
      prompt: text,
    };

    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`Embeddings endpoint failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    if (data.embedding) {
      return data.embedding;
    } else if (data.embeddings && Array.isArray(data.embeddings) && data.embeddings.length > 0) {
      return data.embeddings[0];
    } else if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    
    throw new Error('No embeddings found in response');
  }

  /**
   * Call the alternate Ollama embedding endpoint
   */
  async callEmbedAlternateEndpoint(text, model) {
    const requestData = {
      model,
      prompt: text,
      options: {
        embedding: true,
      }
    };

    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`Alternate embeddings endpoint failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.embedding) {
      return data.embedding;
    } else if (data.embeddings) {
      return data.embeddings;
    }
    
    throw new Error('No embeddings found in alternate response');
  }

  /**
   * Generate random embeddings as a fallback
   * Only used when real embeddings can't be obtained
   */
  generateRandomEmbeddings(dimensions = 384) {
    // Most embedding models use 384 or 768 dimensions
    console.warn(`Generating random ${dimensions}-dimensional embeddings as fallback`);
    return Array.from({ length: dimensions }, () => (Math.random() * 2) - 1);
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * Used for finding similar sections of text
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }

  /**
   * Find the most similar items to a query embedding
   * @param {Array} queryEmbedding - Embedding vector for the query
   * @param {Array} items - Array of items with embeddings to compare against
   * @param {Function} getEmbeddingFn - Function to get embedding from an item
   * @param {number} topK - Number of results to return
   * @returns {Array} - Sorted array of items with similarity scores
   */
  findSimilarItems(queryEmbedding, items, getEmbeddingFn, topK = 3) {
    if (!queryEmbedding || !items || !items.length) {
      return [];
    }
    
    // Calculate similarity for each item
    const scoredItems = items.map(item => {
      const itemEmbedding = getEmbeddingFn(item);
      if (!itemEmbedding) return { item, score: 0 };
      
      const score = this.cosineSimilarity(queryEmbedding, itemEmbedding);
      return { item, score };
    });
    
    // Sort by similarity score (highest first)
    scoredItems.sort((a, b) => b.score - a.score);
    
    // Return top K results
    return scoredItems.slice(0, topK);
  }

  /**
   * Find document sections most relevant to a field or query
   */
  async findRelevantSections(query, sections, topK = 3) {
    if (!query || !sections || !sections.length) {
      return [];
    }
    
    try {
      // Get embedding for the query
      const queryEmbedding = await this.getEmbedding(query);
      
      // Get embeddings for all sections (if not already present)
      const sectionsWithEmbeddings = await Promise.all(
        sections.map(async (section) => {
          if (!section.embedding) {
            section.embedding = await this.getEmbedding(section.text);
          }
          return section;
        })
      );
      
      // Find the most similar sections
      return this.findSimilarItems(
        queryEmbedding,
        sectionsWithEmbeddings,
        (section) => section.embedding,
        topK
      );
    } catch (error) {
      console.error('Error finding relevant sections:', error);
      return sections.slice(0, topK).map(section => ({ item: section, score: 0 }));
    }
  }
  /**
   * Enhanced preprocessing for medical text embeddings
   * Improves nomic-embed-text handling of medical content
   * @param {string} text - The text to preprocess
   * @returns {string} Processed text optimized for embeddings
   */
  enhancedMedicalPreprocessing(text) {
    if (!text || typeof text !== 'string') return '';
    
    // We need to reference the cleanupOcrText function from PDFProcessorService
    // Since we can't directly import it (would create circular dependency),
    // we'll implement a simplified version here
    let processedText = this.simplifiedCleanupOcrText(text);
    
    // Limit text length for embeddings (nomic-embed-text works well with shorter texts)
    const maxLength = 8192;
    if (processedText.length > maxLength) {
      // Instead of just truncating, try to find a good breakpoint
      const breakpoint = processedText.lastIndexOf('.', maxLength);
      if (breakpoint > maxLength * 0.8) {
        processedText = processedText.substring(0, breakpoint + 1);
      } else {
        processedText = processedText.substring(0, maxLength);
      }
    }
    
    // For medical context, enhance important medical terms with special markers
    // This helps nomic-embed-text focus on the medical aspects
    const medicalTerms = {
      // Patient information terms
      'patient': '<PATIENT>',
      'name': '<PATIENT_NAME>',
      'dob': '<DOB>',
      'date of birth': '<DOB>',
      'mrn': '<MRN>',
      
      // Diagnosis terms
      'diagnosis': '<DX>',
      'assessment': '<DX>',
      'impression': '<DX>',
      
      // Medication terms
      'medication': '<MED>',
      'prescribed': '<MED>',
      'dosage': '<MED>',
      'antibiotic': '<MED>',
      
      // Lab terms
      'laboratory': '<LAB>',
      'results': '<LAB>',
      'test': '<LAB>',
      
      // Provider terms
      'physician': '<PROVIDER>',
      'doctor': '<PROVIDER>',
      'provider': '<PROVIDER>',
      
      // Treatment terms
      'treatment': '<TX>',
      'therapy': '<TX>',
      'plan': '<TX>',
      
      // Codes and structured data
      'icd': '<CODE>',
      'cpt': '<CODE>',
      'code': '<CODE>'
    };
    
    // Replace terms with marked versions but avoid over-processing
    // Only mark important medical terms in a subtle way that won't confuse the embedding model
    Object.entries(medicalTerms).forEach(([term, marker]) => {
      // Use word boundary regex to match only complete words
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      processedText = processedText.replace(regex, `${term}${marker}`);
    });
    
    return processedText;
  }

  /**
   * Simplified cleanup of OCR text for embedding preprocessing
   * @param {string} text - Text to clean up
   * @returns {string} Cleaned text
   */
  simplifiedCleanupOcrText(text) {
    if (!text) return '';
    
    let cleaned = text;
    
    // Replace repeated special characters
    cleaned = cleaned.replace(/([^\w\s])\1{2,}/g, '$1');
    
    // Fix obvious OCR errors with spacing
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Fix missing spaces after periods, commas
    cleaned = cleaned.replace(/([.,:;])([a-zA-Z])/g, '$1 $2');
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    
    return cleaned;
  }

  /**
   * Custom cosine similarity calculation that accounts for medical terms
   * Gives higher weight to matches on medical terminology
   * @param {Array} vecA - First embedding vector
   * @param {Array} vecB - Second embedding vector
   * @param {string} textA - First text (optional, used for term boosting)
   * @param {string} textB - Second text (optional, used for term boosting)
   * @returns {number} Enhanced similarity score (0-1)
   */
  enhancedCosineSimilarity(vecA, vecB, textA = '', textB = '') {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }
    
    // Start with standard cosine similarity
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    let similarity = dotProduct / (normA * normB);
    
    // If text is provided, apply term-based boosting
    if (textA && textB) {
      const boostFactor = this.calculateMedicalTermBoost(textA, textB);
      
      // Apply boosting, but cap at 1.0
      similarity = Math.min(similarity * boostFactor, 1.0);
    }
    
    return similarity;
  }

  /**
   * Calculate boost factor based on shared medical terminology
   * @param {string} textA - First text 
   * @param {string} textB - Second text
   * @returns {number} Boost factor (1.0-1.5)
   */
  calculateMedicalTermBoost(textA, textB) {
    // Important medical terms to check for
    const medicalTerms = [
      // Diagnostic terms
      'diagnosis', 'assessment', 'impression', 'condition',
      
      // Patient terms
      'patient', 'dob', 'name', 'age', 'gender',
      
      // Medication terms
      'medication', 'prescription', 'dose', 'dosage', 'antibiotic', 'cardiac',
      
      // Lab terms
      'lab', 'test', 'result', 'value', 'count', 'level',
      
      // Provider terms
      'provider', 'physician', 'doctor', 'specialist', 'surgeon',
      
      // Procedure terms
      'procedure', 'surgery', 'treatment', 'therapy'
    ];
    
    // Count shared medical terms
    let sharedTermCount = 0;
    const textALower = textA.toLowerCase();
    const textBLower = textB.toLowerCase();
    
    for (const term of medicalTerms) {
      if (textALower.includes(term) && textBLower.includes(term)) {
        sharedTermCount++;
      }
    }
    
    // Calculate boost factor (1.0 to 1.5)
    const maxBoost = 1.5;
    const boostPerTerm = 0.05;
    const boost = 1.0 + Math.min(sharedTermCount * boostPerTerm, maxBoost - 1.0);
    
    return boost;
  }

  /**
   * Smart context matching extension for EmbeddingService
   * @param {string} query - The field value to match
   * @param {Array} sections - Document sections to search
   * @param {string} fieldName - Field name for context
   * @param {Array} relevantTypeIds - Relevant section type IDs
   * @returns {Promise<Array>} Matched sections with scores and explanations
   */
  async findContextForField(query, sections, fieldName, relevantTypeIds) {
    if (!query || !sections || !sections.length) {
      return [];
    }
    
    try {
      // Get embedding for the query with special processing for the field type
      const queryEmbedding = await this.getEmbeddingForField(query, fieldName);
      
      // Score all sections
      const scoredSections = await Promise.all(sections.map(async (section) => {
        // Get embedding for section if not already present
        const sectionEmbedding = section.embedding || 
                                await this.getEmbedding(this.enhancedMedicalPreprocessing(section.text));
        
        // Calculate similarity with the enhanced method
        const score = this.enhancedCosineSimilarity(
          queryEmbedding, 
          sectionEmbedding,
          query,
          section.text
        );
        
        // Boost score for sections of relevant types
        let boostedScore = score;
        
        if (relevantTypeIds && relevantTypeIds.includes(section.typeId)) {
          // Boost by 20% for relevant section types, capped at 1.0
          boostedScore = Math.min(score * 1.2, 1.0);
        }
        
        // Generate explanation for this match
        const explanation = this.generateMatchExplanation(
          fieldName, 
          query, 
          section, 
          boostedScore,
          score !== boostedScore
        );
        
        return {
          section,
          score: boostedScore,
          originalScore: score,
          explanation
        };
      }));
      
      // Sort by score (highest first)
      scoredSections.sort((a, b) => b.score - a.score);
      
      return scoredSections;
    } catch (error) {
      console.error('Error in smart context matching:', error);
      return [];
    }
  }

  /**
   * Generate embedding optimized for a specific field type
   * @param {string} text - Text to embed
   * @param {string} fieldName - Field name
   * @returns {Promise<Array>} Embedding vector
   */
  async getEmbeddingForField(text, fieldName) {
    // Optimize prompt based on field type
    let processedText = text;
    
    // Add field-specific context markers to help with embedding
    switch (fieldName) {
      case 'patientName':
        processedText = `Patient Name: ${text}`;
        break;
      case 'patientDOB':
        processedText = `Date of Birth: ${text}`;
        break;
      case 'insurance':
        processedText = `Insurance: ${text}`;
        break;
      case 'dx':
        processedText = `Diagnosis: ${text}`;
        break;
      case 'pcp':
        processedText = `Provider: ${text}`;
        break;
      case 'dc':
        processedText = `Discharge: ${text}`;
        break;
      case 'labs':
        processedText = `Lab Results: ${text}`;
        break;
      case 'mentalHealthState':
        processedText = `Mental Status: ${text}`;
        break;
      default:
        // Leave as is for other fields
        break;
    }
    
    // Get embedding with enhanced preprocessing
    return this.getEmbedding(this.enhancedMedicalPreprocessing(processedText));
  }

  /**
   * Generate explanation for a specific match 
   * @param {string} fieldName - Field name
   * @param {string} query - Field value
   * @param {Object} section - Matched section
   * @param {number} score - Match score
   * @param {boolean} boosted - Whether score was boosted
   * @returns {string} Human-readable explanation
   */
  generateMatchExplanation(fieldName, query, section, score, boosted) {
    const sectionType = SectionType.getName(section.typeId);
    const confidenceLevel = score > 0.8 ? 'high' : score > 0.6 ? 'good' : score > 0.4 ? 'moderate' : 'low';
    
    let explanation = `This ${fieldName} information `;
    
    if (section.text.includes(query)) {
      explanation += `appears directly in the ${sectionType} section with ${confidenceLevel} confidence (${Math.round(score * 100)}%).`;
    } else {
      explanation += `appears to be related to content in the ${sectionType} section with ${confidenceLevel} confidence (${Math.round(score * 100)}%).`;
    }
    
    if (boosted) {
      explanation += ` This section is a relevant location for ${fieldName} information.`;
    }
    
    return explanation;
  }
}

export default EmbeddingService;