/**
 * OllamaService.js - Focused service for text generation using Ollama API
 * This version has been refactored to remove embedding functionality,
 * which now exists in the separate EmbeddingService.
 */
class OllamaService {
  static instance;

  constructor() {
    this.baseUrl = 'http://localhost:11434';
    
    // Set Llama 3.2 1B as the primary model - 1.3GB with 128K context
    this.defaultModel = 'llama3.2:1b';
    
    // Alternative models if the primary one isn't available
    this.fallbackModels = ['llama3:8b', 'llama3.1:8b', 'llama3.1:1b', 'tinyllama', 'phi', 'gemma:2b'];
    
    // Context tracking for shared context with EmbeddingService
    this.contextTrackingEnabled = false;
    this.trackedSections = new Map();
    
    // NEW: Add comprehensive context tracking
    this.contextTracking = {
      enabled: false,
      documents: new Map() // documentId -> important context information
    };
    
    // Optimized extraction prompt using numbered list format instead of JSON
    this.extractionPrompt = `TASK: Extract medical information from the document.

IMPORTANT: Return ONLY a numbered list with the information below. Do not include ANY other text.

PROVIDE EXACTLY THESE 15 ITEMS IN THIS ORDER:
1. Patient Name
2. Date of Birth 
3. Insurance
4. Location
5. Diagnosis
6. Primary Care Provider
7. Discharge Info
8. Wounds
9. Antibiotics
10. Cardiac Medications
11. Labs
12. Face to Face
13. Medical History
14. Mental Health
15. Additional Comments

CRITICAL INSTRUCTIONS:
- If information is found, provide it directly after the number and field name
- If information is NOT found, simply write "Not found" for that item
- Keep answers brief and direct
- DO NOT add explanations or notes
- DO NOT write the word "Not found" if you have actual information
- For DOB, extract any date format you find (MM/DD/YYYY, DD-MM-YYYY, etc.)
- Write EXACTLY one numbered item per line`;

    // Enhanced system prompt for numbered list approach
    this.systemPrompt = `You are a medical information extraction assistant specializing in clinical documents.

You will extract information from medical documents in a SIMPLE NUMBERED LIST format.
Do not use JSON or other complex formats.

CRITICAL RULES:
1. Give EXACTLY 15 numbered items in the exact order requested
2. Format each line as: NUMBER. FIELD NAME: INFORMATION
3. If information is not in the document, write "Not found" 
4. Never include both "Not found" AND actual information together
5. Be direct and brief - no explanations or notes
6. Extract DOB regardless of format (MM/DD/YYYY, DD-MM-YYYY, etc.)
7. Respond ONLY with the 15-item numbered list, nothing else

Common medical abbreviations:
- Dx = Diagnosis
- PCP = Primary Care Provider 
- DC = Discharge
- Hx = History
- Tx = Treatment
- Rx = Prescription`;

    // To track extraction progress
    this.extractionProgress = {
      status: 'idle',
      progress: 0,
      currentStep: '',
      message: ''
    };
    this.progressCallback = null;
    this.initialized = false;
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  /**
   * Get default prompts (static method)
   * @returns {Object} Default extraction and system prompts
   */
  static getDefaultPrompts() {
    const defaults = new OllamaService();
    return {
      extractionPrompt: defaults.extractionPrompt,
      systemPrompt: defaults.systemPrompt
    };
  }

  /**
   * Set the progress callback function
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * Update extraction progress
   */
  updateProgress(status, progress, currentStep, message) {
    this.extractionProgress = {
      status,
      progress,
      currentStep,
      message
    };

    if (this.progressCallback) {
      this.progressCallback(this.extractionProgress);
    }
  }

  /**
   * Set the base URL for the Ollama API
   */
  setBaseUrl(url) {
    if (url && url.trim()) {
      this.baseUrl = url.trim();
      console.log('Ollama base URL set to:', this.baseUrl);
    }
  }

  /**
   * Set the default model to use
   */
  setDefaultModel(model) {
    if (model && model.trim()) {
      this.defaultModel = model.trim();
      console.log('Ollama default model set to:', this.defaultModel);
    }
  }
  
  /**
   * Set extraction prompt
   */
  setExtractionPrompt(prompt) {
    if (prompt && prompt.trim()) {
      this.extractionPrompt = prompt.trim();
      console.log('Extraction prompt updated, length:', this.extractionPrompt.length);
    }
  }
  
  /**
   * Set system prompt
   */
  setSystemPrompt(prompt) {
    if (prompt && prompt.trim()) {
      this.systemPrompt = prompt.trim();
      console.log('System prompt updated, length:', this.systemPrompt.length);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      extractionPrompt: this.extractionPrompt,
      systemPrompt: this.systemPrompt
    };
  }
  
  /**
   * Enable or disable context tracking for shared context with EmbeddingService
   * @param {boolean} enable - Whether to enable context tracking
   */
  enableContextTracking(enable = true) {
    this.contextTrackingEnabled = !!enable;
    this.contextTracking.enabled = !!enable;
    console.log(`Context tracking ${enable ? 'enabled' : 'disabled'}`);
    
    // Clear tracked sections when disabling
    if (!enable) {
      this.trackedSections.clear();
      this.contextTracking.documents.clear();
    }
    
    return enable;
  }
  
  /**
   * Add a section to tracked context for current document
   * @param {string} documentId - Document ID
   * @param {Object} section - Section to track
   */
  trackSection(documentId, section) {
    if (!this.contextTrackingEnabled) return;
    
    if (!this.trackedSections.has(documentId)) {
      this.trackedSections.set(documentId, []);
    }
    
    this.trackedSections.get(documentId).push(section);
    console.log(`Tracked section for document ${documentId}: ${section.type}`);
  }
  
  /**
   * Get tracked sections for a document
   * @param {string} documentId - Document ID
   * @returns {Array} Tracked sections
   */
  getTrackedSections(documentId) {
    return this.trackedSections.get(documentId) || [];
  }
  
  /**
   * Clear tracked sections for a document
   * @param {string} documentId - Document ID
   */
  clearTrackedSections(documentId) {
    if (this.trackedSections.has(documentId)) {
      this.trackedSections.delete(documentId);
      console.log(`Cleared tracked sections for document ${documentId}`);
    }
    
    // Also clear from new context tracking
    if (this.contextTracking.documents.has(documentId)) {
      this.contextTracking.documents.delete(documentId);
      console.log(`Cleared context tracking for document ${documentId}`);
    }
  }
  
  /**
   * Get important context identified during extraction
   * @param {string} documentId - Document ID
   * @returns {Object} Important context information
   */
  getImportantContext(documentId) {
    if (!this.contextTracking.enabled || !documentId) {
      return null;
    }
    
    // Check the new context tracking structure first
    const contextInfo = this.contextTracking.documents.get(documentId);
    if (contextInfo) {
      return contextInfo;
    }
    
    // Fallback to old tracking if available
    if (this.trackedSections.has(documentId)) {
      const trackedSections = this.trackedSections.get(documentId);
      const fieldContexts = new Map();
      const textSamples = new Map();
      
      // Group tracked sections by field
      trackedSections.forEach((section) => {
        if (section.field) {
          if (!fieldContexts.has(section.field)) {
            fieldContexts.set(section.field, []);
          }
          
          fieldContexts.get(section.field).push(section.id || `tracked-${section.field}-${Date.now()}`);
          
          if (section.value) {
            textSamples.set(section.field, section.value);
          }
        }
      });
      
      return {
        documentId,
        timestamp: new Date().toISOString(),
        fieldContexts,
        textSamples
      };
    }
    
    return null;
  }
  
  /**
   * Track important fields found in extraction results
   * @param {string} documentId - Document ID
   * @param {Object} result - Extraction result
   * @param {string} chunkText - Source text chunk
   */
  trackImportantFieldsFromResult(documentId, result, chunkText) {
    if (!this.contextTrackingEnabled || !documentId || !result) return;
    
    // Important fields to track - expanded list
    const importantFields = [
      'patientName', 'patientDOB', 'dx', 'pcp', 
      'medications', 'labs', 'discharge', 'insurance',
      'antibiotics', 'cardiacDrips', 'wounds', 'history',
      'mentalHealthState', 'location', 'faceToFace'
    ];
    
    for (const field of importantFields) {
      if (result[field] && result[field].trim() && result[field] !== 'Not found') {
        // Find the context around this value in the chunk
        const value = result[field];
        const position = chunkText.toLowerCase().indexOf(value.toLowerCase());
        
        if (position !== -1) {
          // Extract expanded context around the value
          const contextStart = Math.max(0, position - 200); // More context
          const contextEnd = Math.min(chunkText.length, position + value.length + 200);
          const context = chunkText.substring(contextStart, contextEnd);
          
          // Calculate confidence based on how clearly the value appears
          const confidence = this.calculateFieldConfidence(field, value, context);
          
          this.trackSection(documentId, {
            field,
            value,
            context,
            type: this.getFieldType(field),
            timestamp: new Date().toISOString(),
            confidence,
            id: `${field}-${Date.now()}`, // Add unique ID
            chunkIndex: this.currentChunkIndex || 0 // Track which chunk this came from
          });
        } else {
          // If exact match not found, try to find partial matches
          const partialContext = this.findPartialMatchContext(value, chunkText);
          if (partialContext) {
            this.trackSection(documentId, {
              field,
              value,
              context: partialContext.context,
              type: this.getFieldType(field),
              timestamp: new Date().toISOString(),
              confidence: partialContext.confidence,
              id: `${field}-${Date.now()}`,
              matchType: 'partial'
            });
          }
        }
      }
    }
  }
  
  /**
   * Calculate confidence score for a field extraction
   * @param {string} field - Field name
   * @param {string} value - Extracted value
   * @param {string} context - Context text
   * @returns {number} Confidence score
   */
  calculateFieldConfidence(field, value, context) {
    let confidence = 0.5; // Base confidence
    
    // Exact match in context increases confidence
    if (context.includes(value)) {
      confidence += 0.2;
    }
    
    // Field-specific patterns increase confidence
    const fieldPatterns = {
      patientName: /(?:patient|name|mr\.|mrs\.|ms\.)/i,
      patientDOB: /(?:dob|date.*birth|born)/i,
      dx: /(?:diagnosis|dx|assessment|impression)/i,
      pcp: /(?:physician|doctor|pcp|provider)/i,
      medications: /(?:medication|drug|prescription|rx)/i
    };
    
    if (fieldPatterns[field] && fieldPatterns[field].test(context)) {
      confidence += 0.2;
    }
    
    // Clear structure (colon, equals) increases confidence
    if (context.includes(':') || context.includes('=')) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Find partial match context for a value
   * @param {string} value - Value to find
   * @param {string} text - Text to search in
   * @returns {Object|null} Context and confidence
   */
  findPartialMatchContext(value, text) {
    const valueParts = value.split(/\s+/);
    let bestMatch = null;
    let bestConfidence = 0;
    
    // Try to find parts of the value
    for (const part of valueParts) {
      if (part.length < 3) continue; // Skip very short parts
      
      const position = text.toLowerCase().indexOf(part.toLowerCase());
      if (position !== -1) {
        const contextStart = Math.max(0, position - 150);
        const contextEnd = Math.min(text.length, position + part.length + 150);
        const context = text.substring(contextStart, contextEnd);
        
        // Calculate confidence based on how much of the value was found
        const confidence = (part.length / value.length) * 0.7; // Max 0.7 for partial matches
        
        if (confidence > bestConfidence) {
          bestMatch = { context, confidence };
          bestConfidence = confidence;
        }
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Get section type for a field
   * @param {string} field - Field name
   * @returns {string} Section type
   */
  getFieldType(field) {
    const fieldTypeMap = {
      patientName: 'Patient Information',
      patientDOB: 'Patient Information',
      insurance: 'Insurance',
      dx: 'Diagnosis',
      pcp: 'Provider',
      dc: 'Discharge',
      labs: 'Labs',
      medications: 'Medications',
      history: 'History',
      mentalHealthState: 'Mental Status'
    };
    
    return fieldTypeMap[field] || 'General';
  }
  
  /**
   * Find relevant reference sections for a text chunk
   * @param {string} chunkText - Text chunk to find references for
   * @param {Array} referenceSections - Available reference sections
   * @returns {Array} Relevant sections
   */
  findRelevantReferenceSections(chunkText, referenceSections) {
    if (!chunkText || !referenceSections || referenceSections.length === 0) {
      return [];
    }
    
    const relevantSections = [];
    const chunkLower = chunkText.toLowerCase();
    
    // Medical keywords to look for
    const medicalKeywords = {
      'Patient Information': ['patient', 'name', 'dob', 'birth', 'demographics'],
      'Diagnosis': ['diagnosis', 'dx', 'assessment', 'impression'],
      'Medications': ['medication', 'drug', 'prescription', 'rx'],
      'Provider': ['physician', 'doctor', 'provider', 'pcp'],
      'Labs': ['lab', 'test', 'result', 'blood'],
      'Discharge': ['discharge', 'disposition', 'follow'],
      'History': ['history', 'past', 'medical'],
      'Mental Status': ['mental', 'psychiatric', 'psychological']
    };
    
    // Check each reference section for relevance
    for (const section of referenceSections) {
      let isRelevant = false;
      
      // Check if section text appears in chunk
      if (section.text && chunkLower.includes(section.text.toLowerCase().substring(0, 50))) {
        isRelevant = true;
      }
      
      // Check for keyword matches
      if (!isRelevant && section.type) {
        const keywords = medicalKeywords[section.type];
        if (keywords) {
          for (const keyword of keywords) {
            if (chunkLower.includes(keyword)) {
              isRelevant = true;
              break;
            }
          }
        }
      }
      
      if (isRelevant) {
        relevantSections.push(section);
      }
    }
    
    // Limit to top 5 most relevant sections
    return relevantSections.slice(0, 5);
  }

  /**
   * Get comprehensive context information for a document
   * @param {string} documentId - Document ID
   * @returns {Object} Comprehensive context info
   */
  getComprehensiveContext(documentId) {
    const result = {
      documentId,
      hasLegacyTracking: this.trackedSections.has(documentId),
      hasNewTracking: this.contextTracking.documents.has(documentId),
      legacySections: this.trackedSections.get(documentId) || [],
      newContext: this.contextTracking.documents.get(documentId) || null,
      timestamp: new Date().toISOString()
    };
    
    // Combine tracking info if both exist
    if (result.hasLegacyTracking && result.hasNewTracking) {
      result.combinedFieldContexts = new Map();
      
      // Add new tracking field contexts
      if (result.newContext && result.newContext.fieldContexts) {
        result.newContext.fieldContexts.forEach((sectionIds, field) => {
          result.combinedFieldContexts.set(field, sectionIds);
        });
      }
      
      // Add legacy tracking sections
      result.legacySections.forEach(section => {
        if (section.field && section.id) {
          if (!result.combinedFieldContexts.has(section.field)) {
            result.combinedFieldContexts.set(section.field, []);
          }
          result.combinedFieldContexts.get(section.field).push(section.id);
        }
      });
    }
    
    return result;
  }
  
  /**
   * Track which sections were used in a chunk
   * @param {string} documentId - Document ID
   * @param {string} chunkText - Text of the current chunk
   * @param {Object} references - Document references
   * @param {Object} extractedResult - Extraction results from this chunk
   */
  trackChunkSections(documentId, chunkText, references, extractedResult) {
    try {
      const contextInfo = this.contextTracking.documents.get(documentId);
      if (!contextInfo) return;
      
      const { fieldContexts, textSamples } = contextInfo;
      
      // For each extracted field
      Object.entries(extractedResult).forEach(([field, value]) => {
        // Skip metadata fields or empty values
        if (field.startsWith('_') || 
            field === 'extractionMethod' || 
            field === 'extractionDate' || 
            !value || 
            typeof value !== 'string' || 
            value.trim() === '') {
          return;
        }
        
        // Store text sample used to extract this field
        textSamples.set(field, value);
        
        // Find sections containing this value or text around it
        const matchingSections = this.findSectionsForValue(chunkText, value, references);
        
        if (matchingSections.length > 0) {
          // Store section IDs
          const sectionIds = matchingSections.map(s => s.id);
          fieldContexts.set(field, sectionIds);
          
          console.log(`Tracked ${matchingSections.length} sections for field "${field}"`);
        }
      });
    } catch (error) {
      console.warn('Error tracking chunk sections:', error);
      // Continue without tracking
    }
  }
  
  /**
   * Helper to find sections that likely contain a value
   * @param {string} chunkText - Text chunk
   * @param {string} value - Value to find
   * @param {Object} references - Document references
   * @returns {Array} Matching sections
   */
  findSectionsForValue(chunkText, value, references) {
    if (!value || !chunkText || !references || !references.sections) {
      return [];
    }
    
    // Find position of value in chunk
    let valueIndex = chunkText.indexOf(value);
    
    if (valueIndex === -1) {
      // Try case-insensitive search
      const lowerChunk = chunkText.toLowerCase();
      const lowerValue = value.toLowerCase();
      valueIndex = lowerChunk.indexOf(lowerValue);
      
      if (valueIndex === -1) {
        return [];
      }
    }
    
    // Extract context around the value (300 chars before and after)
    const contextStart = Math.max(0, valueIndex - 300);
    const contextEnd = Math.min(chunkText.length, valueIndex + value.length + 300);
    const valueContext = chunkText.substring(contextStart, contextEnd);
    
    // Find sections that contain this context
    return references.sections.filter(section => {
      if (!section.text) return false;
      
      // Check if section contains the value
      if (section.text.includes(value)) {
        return true;
      }
      
      // Check if section contains significant parts of the context
      const contextParts = valueContext.split(/[.!?]\s+/);
      for (const part of contextParts) {
        if (part.length > 20 && section.text.includes(part)) {
          return true;
        }
      }
      
      return false;
    });
  }
  
  /**
   * Test the connection to the Ollama server
   */
  async testConnection() {
    console.log('Testing connection to Ollama server:', `${this.baseUrl}/api/version`);
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        console.error('Ollama connection failed:', response.status, response.statusText);
        throw new Error(`Failed to connect to Ollama server: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Ollama connection successful, version:', data.version);
      return true;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels() {
    console.log('Fetching available models from Ollama');
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        console.error('Failed to get models:', response.status, response.statusText);
        throw new Error(`Failed to get models: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Raw models response:', data);
      
      // Handle different response formats from different Ollama versions
      if (data.models) {
        // Newer format
        const models = data.models.map(model => model.name || model);
        console.log('Found models:', models);
        return models;
      } else if (Array.isArray(data)) {
        // Some versions return an array directly
        const models = data.map(model => model.name || model);
        console.log('Found models:', models);
        return models;
      } else if (typeof data === 'object' && data !== null) {
        // Try to extract models from other formats
        const possibleModels = Object.keys(data).filter(key => 
          typeof data[key] === 'object' && data[key] !== null
        );
        if (possibleModels.length > 0) {
          console.log('Found possible models:', possibleModels);
          return possibleModels;
        }
      }
      
      console.warn('No models found or unexpected format');
      return [];
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }

  /**
   * Initialize the service by finding the appropriate model
   */
  async initialize() {
    // Skip if already initialized
    if (this.initialized) {
      console.log('OllamaService already initialized');
      return true;
    }
    
    console.log('Initializing OllamaService...');
    try {
      // Check connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        console.error('Ollama server not available');
        return false;
      }
      
      // First try to check if our preferred model exists
      try {
        console.log(`Checking if ${this.defaultModel} exists...`);
        const response = await fetch(`${this.baseUrl}/api/show`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: this.defaultModel }),
        });
        
        if (response.ok) {
          console.log(`Confirmed ${this.defaultModel} is available`);
          this.initialized = true;
          return true;
        } else {
          console.warn(`${this.defaultModel} not found, checking alternatives...`);
        }
      } catch (error) {
        console.warn(`Error checking ${this.defaultModel}:`, error);
      }
      
      // If preferred model not found, try to get all available models
      const models = await this.getAvailableModels();
      console.log('Available models:', models);
      
      if (models && models.length > 0) {
        // First, check if any of our preferred models are available
        for (const model of [this.defaultModel, ...this.fallbackModels]) {
          if (models.includes(model)) {
            this.defaultModel = model;
            console.log(`Using generation model: ${this.defaultModel}`);
            this.initialized = true;
            return true;
          }
        }
        
        // If none of the preferred models found, use the first available one
        this.defaultModel = models[0];
        console.log(`Using available generation model: ${this.defaultModel}`);
        this.initialized = true;
        return true;
      }
      
      console.error('No models available in Ollama');
      return false;
    } catch (error) {
      console.error('Error initializing OllamaService:', error);
      return false;
    }
  }

  /**
   * Generate a completion using Ollama API
   */
  async generateCompletion(
    prompt, 
    model = null,
    systemPrompt = null,
    options = {}
  ) {
    // Ensure the service is initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Use default values if not provided
    if (!model) {
      model = this.defaultModel;
    }
    
    if (!systemPrompt) {
      systemPrompt = this.systemPrompt;
    }
    
    console.log(`Generating completion with model: ${model}`);
    console.log(`Prompt length: ${prompt.length} characters`);
    
    try {
      // Current API format for Ollama
      const requestData = {
        model,
        prompt,
        // In newer Ollama versions, options are at the top level
        temperature: options.temperature !== undefined ? options.temperature : 0.1, // Lower temperature for extraction tasks
        top_p: options.top_p !== undefined ? options.top_p : 0.9,
        top_k: options.top_k !== undefined ? options.top_k : 40,
        stream: false,
      };

      // Add system prompt if provided
      if (systemPrompt) {
        requestData.system = systemPrompt;
        console.log('Using system prompt, length:', systemPrompt.length);
      }

      const requestUrl = `${this.baseUrl}/api/generate`;
      console.log('Sending request to:', requestUrl);
      
      // Update progress - starting inference
      this.updateProgress(
        'processing', 
        0.4, 
        'Analyzing document',
        `Running AI model: ${model}`
      );
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        console.error('Ollama API error:', response.status, response.statusText, errorText);
        
        // Update progress - error
        this.updateProgress(
          'error', 
          0.4, 
          'Model error',
          `Error running model: ${errorText}`
        );
        
        // If the specified model doesn't exist, try a fallback model
        if (response.status === 404 && errorText.includes('model')) {
          console.log('Model not found, attempting fallback to any available model');
          const models = await this.getAvailableModels();
          
          if (models.length > 0) {
            const fallbackModel = models[0];
            console.log(`Trying fallback model: ${fallbackModel}`);
            
            // Update progress - trying fallback
            this.updateProgress(
              'processing', 
              0.4, 
              'Using fallback model',
              `Model not found, trying: ${fallbackModel}`
            );
            
            // Update request with fallback model
            requestData.model = fallbackModel;
            
            const fallbackResponse = await fetch(requestUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestData),
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              console.log('Fallback model succeeded');
              
              // Update progress - fallback succeeded
              this.updateProgress(
                'processing', 
                0.6, 
                'Analyzing complete',
                'Fallback model analysis successful'
              );
              
              // Handle different response formats
              if (fallbackData.response) {
                return fallbackData.response;
              } else if (fallbackData.generations && Array.isArray(fallbackData.generations) && fallbackData.generations.length > 0) {
                return fallbackData.generations[0].text || '';
              } else if (fallbackData.output) {
                return fallbackData.output;
              }
            }
          }
        }
        
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json();
      
      // Update progress - success
      this.updateProgress(
        'processing', 
        0.7, 
        'Analysis complete',
        'Successfully extracted information'
      );
      
      // Handle different response formats
      if (data.response) {
        return data.response;
      } else if (data.generations && Array.isArray(data.generations) && data.generations.length > 0) {
        return data.generations[0].text || '';
      } else if (data.output) {
        return data.output;
      } else {
        console.warn('Unexpected response format from Ollama:', data);
        return JSON.stringify(data);
      }
    } catch (error) {
      console.error('Ollama completion error:', error);
      
      // Update progress - error
      this.updateProgress(
        'error', 
        0.4, 
        'Analysis failed',
        `Error: ${error.message}`
      );
      
      throw error;
    }
  }

  /**
   * Parse a numbered list response from the LLM into a structured object
   * @param {string} text - The LLM response with numbered list
   * @returns {Object} - Structured data object
   */
  parseNumberedListFromLLM(text) {
    const result = {
      extractionMethod: 'numbered-list',
      extractionDate: new Date().toISOString(),
      patientName: '',
      patientDOB: '',
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
    
    // Create a mapping from list numbers to field names
    const fieldMapping = {
      1: 'patientName',
      2: 'patientDOB',
      3: 'insurance',
      4: 'location',
      5: 'dx',           // Diagnosis
      6: 'pcp',          // Primary Care Provider
      7: 'dc',           // Discharge Info
      8: 'wounds',
      9: 'antibiotics',
      10: 'cardiacDrips', // Cardiac Medications
      11: 'labs',         // Lab results
      12: 'faceToFace',   // Face to Face evaluation
      13: 'history',      // Medical History
      14: 'mentalHealthState', // Mental Health
      15: 'additionalComments'
    };
    
    // Split by new lines
    const lines = text.split('\n');
    
    // Process each line
    for (const line of lines) {
      // Look for patterns like "1. Patient Name: John Doe"
      const match = line.match(/^\s*(\d+)\s*\.?\s*.*?:\s*(.*?)\s*$/);
      if (match) {
        const [, numberStr, value] = match;
        const number = parseInt(numberStr, 10);
        
        // Map to the correct field name
        const fieldName = fieldMapping[number];
        if (fieldName && value && value.toLowerCase() !== 'not found') {
          result[fieldName] = value.trim();
        }
      }
    }
    
    return result;
  }

  /**
   * Extract information from document text
   * @param {string} text - Document text
   * @param {Object|null} schema - Optional schema for extraction
   * @param {string|null} model - Optional model override
   * @param {Object|null} context - Optional context object with documentId and references
   * @returns {Promise<Object>} - Extracted information
   */
  async extractInformation(text, schema = null, model = null, context = null) {
    try {
      // Update progress - starting
      this.updateProgress(
        'processing', 
        0.3, 
        'Starting AI analysis',
        'Preparing document for AI extraction'
      );
      
      // Extract documentId and references from context if provided
      let documentId = null;
      let references = null;
      
      if (context && typeof context === 'object') {
        documentId = context.documentId;
        references = context.references;
      } else if (typeof context === 'string') {
        // Backward compatibility - context as documentId string
        documentId = context;
      }
      
      // Initialize context tracking for this document if enabled
      if (this.contextTracking.enabled && documentId && references) {
        this.contextTracking.documents.set(documentId, {
          documentId,
          timestamp: new Date().toISOString(),
          fieldContexts: new Map(), // fieldName -> array of section IDs
          textSamples: new Map()    // fieldName -> sample text used to extract
        });
        
        console.log(`Initialized context tracking for document ${documentId}`);
      }
      
      // Legacy tracking
      if (this.contextTrackingEnabled && documentId) {
        console.log(`Using context tracking for document ${documentId}`);
        
        // Use references for enhanced extraction if available
        if (references && references.sections) {
          console.log(`Using ${references.sections.length} reference sections for context-aware extraction`);
        }
      }
      
      // Use a different chunking strategy for Llama 3.2 1B - 
      // it has a 128K context window, so we can potentially send more at once
      const MAX_CHUNK_SIZE = 12000; // Characters per chunk - larger for 128K context model
      
      // For very long documents, process in chunks
      if (text.length > MAX_CHUNK_SIZE) {
        console.log(`Document is ${text.length} chars, chunking into ${MAX_CHUNK_SIZE}-char parts`);
        
        // Update progress - chunking
        this.updateProgress(
          'processing', 
          0.32, 
          'Document preprocessing',
          `Dividing document into processable chunks (${Math.ceil(text.length / MAX_CHUNK_SIZE)})`
        );
        
        // Break into chunks with overlap
        const chunks = this.splitIntoChunks(text, MAX_CHUNK_SIZE, 1000);
        console.log(`Split into ${chunks.length} chunks`);
        
        // Extract from each chunk separately
        const chunkResults = [];
        for (let i = 0; i < chunks.length; i++) {
          console.log(`Processing chunk ${i+1}/${chunks.length} (${chunks[i].length} chars)`);
          
          // Update progress - processing chunk
          this.updateProgress(
            'processing', 
            0.35 + (0.4 * (i / chunks.length)), 
            `Analyzing section ${i+1}/${chunks.length}`,
            `Processing document section ${i+1} of ${chunks.length}`
          );
          
          // Store current chunk index for tracking
          this.currentChunkIndex = i;
          
          // Process each chunk using the numbered list approach
          const chunkResult = await this.processSingleChunk(
            chunks[i], 
            schema, 
            model, 
            documentId, 
            references
          );
          chunkResults.push(chunkResult);
          
          // Track important sections if context tracking is enabled
          if (this.contextTrackingEnabled && documentId && chunkResult) {
            this.trackImportantFieldsFromResult(documentId, chunkResult, chunks[i]);
          }
          
          // NEW: Track chunk sections for comprehensive context tracking
          if (this.contextTracking.enabled && documentId && references) {
            this.trackChunkSections(documentId, chunks[i], references, chunkResult);
          }
          
          // Log the extracted fields for this chunk
          console.log(`Chunk ${i+1} extracted fields:`, 
            Object.entries(chunkResult)
              .filter(([key, value]) => !key.startsWith('_') && key !== 'extractionMethod' && key !== 'extractionDate')
              .map(([key, value]) => `${key}: ${value ? 'found' : 'empty'}`)
          );
        }
        
        // Update progress - merging results
        this.updateProgress(
          'processing', 
          0.8, 
          'Finalizing results',
          'Combining information from all document sections'
        );
        
        // Merge the results
        console.log(`Merging results from ${chunkResults.length} chunks`);
        return this.mergeChunkResults(chunkResults);
      } else {
        // For shorter texts, process directly
        const result = await this.processSingleChunk(
          text, 
          schema, 
          model, 
          documentId,
          references
        );
        
        // Track important fields if context tracking is enabled
        if (this.contextTrackingEnabled && documentId && result) {
          this.trackImportantFieldsFromResult(documentId, result, text);
        }
        
        // NEW: Track context for single chunk
        if (this.contextTracking.enabled && documentId && references) {
          this.trackChunkSections(documentId, text, references, result);
        }
        
        return result;
      }
    } catch (error) {
      console.error('Information extraction error:', error);
      
      // Update progress - error
      this.updateProgress(
        'error', 
        0.5, 
        'Extraction failed',
        `Error: ${error.message}`
      );
      
      return {
        extractionMethod: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
        // Include raw output if available
        rawOutput: error.rawOutput || '',
      };
    }
  }

  /**
   * Split text into overlapping chunks for processing
   */
  splitIntoChunks(text, chunkSize, overlap) {
    const chunks = [];
    let startIndex = 0;
    
    while (startIndex < text.length) {
      let endIndex = Math.min(startIndex + chunkSize, text.length);
      
      // Try to find a good split point (end of paragraph)
      if (endIndex < text.length) {
        const nextParagraph = text.indexOf('\n\n', endIndex - overlap);
        if (nextParagraph !== -1 && nextParagraph < endIndex + overlap) {
          endIndex = nextParagraph + 2; // Include the double newline
        }
      }
      
      chunks.push(text.substring(startIndex, endIndex));
      startIndex = endIndex - overlap;
      
      // Ensure we make progress
      if (startIndex <= 0 || endIndex >= text.length) {
        break;
      }
    }
    
    return chunks;
  }

  /**
   * Process a single chunk of text using the numbered list approach
   * @param {string} text - Text chunk to process
   * @param {Object|null} schema - Optional schema
   * @param {string|null} model - Optional model override
   * @param {string|null} documentId - Optional document ID for context
   * @param {Object|null} references - Optional reference sections for context
   */
  async processSingleChunk(text, schema, model, documentId = null, references = null) {
    // Create enhanced prompt with reference context if available
    let combinedPrompt = this.extractionPrompt;
    
    // Add reference context if available
    if (references && references.sections && references.sections.length > 0) {
      const relevantSections = this.findRelevantReferenceSections(text, references.sections);
      if (relevantSections.length > 0) {
        const contextInfo = relevantSections.map(s => `- ${s.type}: ${s.text.substring(0, 100)}...`).join('\n');
        combinedPrompt += `\n\nREFERENCE CONTEXT (from document structure):\n${contextInfo}\n`;
      }
    }
    
    combinedPrompt += `\n\nTEXT TO EXTRACT FROM:\n${text}`;
    
    // Use a lower temperature for more deterministic results
    const extractionOptions = {
      temperature: 0.1, // Very low temperature for consistent extraction
    };
    
    // Generate completion with the combined prompt
    const result = await this.generateCompletion(
      combinedPrompt,
      model,
      this.systemPrompt,
      extractionOptions
    );
    
    // Process the numbered list response
    try {
      // Try to parse the numbered list format
      const extractedData = this.parseNumberedListFromLLM(result);
      
      console.log('Successfully extracted data from numbered list');
      
      // Update progress - successful extraction
      this.updateProgress(
        'processing', 
        0.75, 
        'Information extracted',
        'Successfully extracted structured data'
      );
      
      return extractedData;
    } catch (error) {
      console.error('Failed to parse numbered list response:', error);
      console.log('Raw LLM output:', result);
      
      // Update progress - parsing error
      this.updateProgress(
        'error', 
        0.7, 
        'Parsing error',
        `Failed to extract information: ${error.message}`
      );
      
      // Try a more aggressive fallback approach to salvage any data
      try {
        // Look for any numbered entries in the text
        const fallbackData = this.extractWithFallbackParser(result);
        
        if (Object.keys(fallbackData).filter(k => k !== 'extractionMethod' && k !== 'extractionDate').length > 0) {
          console.log('Successfully extracted some data with fallback parser');
          return {
            ...fallbackData,
            extractionMethod: 'fallback-numbered-list',
            extractionDate: new Date().toISOString(),
            _originalOutput: result // Store the original for debugging
          };
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
      }
      
      // Return error information with raw output for debugging
      const errorObj = {
        extractionMethod: 'failed',
        error: 'Parsing error',
        errorDetails: error.message,
        rawOutput: result, // Include full raw output for debugging
        timestamp: new Date().toISOString()
      };
      
      // Add the error object to the throw so it gets properly passed up
      error.rawOutput = result;
      throw error;
    }
  }
  
  /**
   * Fallback parser that tries to extract any numbered list items
   * @param {string} text - Raw LLM output
   * @returns {Object} - Extracted data object
   */
  extractWithFallbackParser(text) {
    const result = {
      extractionMethod: 'fallback-numbered-list',
      extractionDate: new Date().toISOString(),
      patientName: '',
      patientDOB: '',
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
    
    // Look for any lines with numbers followed by text
    const lines = text.split('\n');
    
    // Field name hints to help with fuzzy matching
    const fieldHints = {
      patientName: ['patient', 'name', 'person'],
      patientDOB: ['dob', 'birth', 'date of birth', 'born'],
      insurance: ['insurance', 'coverage', 'provider'],
      location: ['location', 'facility', 'hospital', 'place'],
      dx: ['dx', 'diagnosis', 'condition', 'ailment'],
      pcp: ['pcp', 'doctor', 'physician', 'provider'],
      dc: ['dc', 'discharge', 'released'],
      wounds: ['wounds', 'injury', 'laceration', 'cut'],
      antibiotics: ['antibiotics', 'antibiotic', 'medication'],
      cardiacDrips: ['cardiac', 'heart', 'drip', 'medication'],
      labs: ['labs', 'laboratory', 'test', 'result'],
      faceToFace: ['face', 'meeting', 'encounter', 'visit'],
      history: ['history', 'past', 'previous', 'background'],
      mentalHealthState: ['mental', 'psych', 'cognitive', 'emotional'],
      additionalComments: ['additional', 'comment', 'note', 'other']
    };
    
    for (const line of lines) {
      // Try to extract any content that looks like a field
      const match = line.match(/(\d+)\.?\s*(.+?):\s*(.+)/);
      if (match) {
        const [, numberStr, label, value] = match;
        
        if (!value || value.toLowerCase() === 'not found' || value.trim() === '') {
          continue;
        }
        
        // Try to map to a field name based on the label and hints
        const labelLower = label.toLowerCase();
        let matchedField = null;
        
        // Check for direct matches with field name hints
        for (const [field, hints] of Object.entries(fieldHints)) {
          for (const hint of hints) {
            if (labelLower.includes(hint)) {
              matchedField = field;
              break;
            }
          }
          if (matchedField) break;
        }
        
        // If a field was matched, save the value
        if (matchedField) {
          result[matchedField] = value.trim();
        } else {
          // Try mapping by number if no field matched
          const number = parseInt(numberStr, 10);
          const fieldMapping = {
            1: 'patientName',
            2: 'patientDOB',
            3: 'insurance',
            4: 'location',
            5: 'dx',
            6: 'pcp',
            7: 'dc',
            8: 'wounds',
            9: 'antibiotics',
            10: 'cardiacDrips',
            11: 'labs',
            12: 'faceToFace',
            13: 'history',
            14: 'mentalHealthState',
            15: 'additionalComments'
          };
          
          const fieldName = fieldMapping[number];
          if (fieldName) {
            result[fieldName] = value.trim();
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Merge results from multiple chunks with the numbered list approach
   */
  mergeChunkResults(results) {
    const mergedResult = {
      extractionMethod: 'numbered-list',
      extractionDate: new Date().toISOString()
    };
    
    // Define the expected fields
    const fields = [
      'patientName', 'patientDOB', 'insurance', 'location', 'dx', 'pcp', 'dc', 'wounds', 
      'antibiotics', 'cardiacDrips', 'labs', 'faceToFace', 
      'history', 'mentalHealthState', 'additionalComments'
    ];
    
    // For each field, combine the results from all chunks using a smart approach
    fields.forEach(field => {
      // Get all non-empty values for this field
      const fieldValues = results
        .map(result => result[field] || '')
        .filter(value => value.trim() !== '');
      
      if (fieldValues.length === 0) {
        // No values found
        mergedResult[field] = '';
        return;
      }
      
      // For single-value fields, use the longest answer (likely most complete)
      const singleValueFields = ['patientName', 'patientDOB', 'insurance', 'location', 'pcp', 'dc'];
      if (singleValueFields.includes(field)) {
        // Sort by length and take the longest (potentially most detailed) one
        fieldValues.sort((a, b) => b.length - a.length);
        mergedResult[field] = fieldValues[0];
        return;
      }
      
      // For possibly multi-value fields, combine all unique values
      const uniqueValues = [...new Set(fieldValues)];
      
      // Check if values are redundant (one contains another)
      const nonRedundantValues = uniqueValues.filter((value, index) => {
        // Keep value if it's not a substring of any other value
        return !uniqueValues.some((otherValue, otherIndex) => {
          return index !== otherIndex && otherValue.includes(value);
        });
      });
      
      // Join with appropriate separator
      mergedResult[field] = nonRedundantValues.join(' ');
    });
    
    // Update progress - merging complete
    this.updateProgress(
      'processing', 
      0.9, 
      'Extraction complete',
      'Successfully combined and processed all information'
    );
    
    return mergedResult;
  }
}

export default OllamaService;