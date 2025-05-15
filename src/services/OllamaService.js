/**
 * Enhanced OllamaService with Llama 3.2 1B optimization
 */
class OllamaService {
  static instance;

  constructor() {
    this.baseUrl = 'http://localhost:11434';
    
    // Set Llama 3.2 1B as the primary model - 1.3GB with 128K context
    this.defaultModel = 'llama3.2:1b';
    
    // Alternative models if the primary one isn't available
    this.fallbackModels = ['llama3:8b', 'llama3.1:8b', 'llama3.1:1b', 'tinyllama', 'phi', 'gemma:2b'];
    
    // Optimized extraction prompt for Llama 3.2 1B, now with patient name and DOB
    this.extractionPrompt = `TASK: Extract medical information from the document.

OUTPUT FORMAT: JSON with these exact keys:
- patientName
- patientDOB
- insurance
- location
- dx
- pcp
- dc
- wounds
- antibiotics
- cardiacDrips
- labs
- faceToFace
- history
- mentalHealthState
- additionalComments

EXTRACTION GUIDE:
- "patientName" = patient's full name
- "patientDOB" = patient's date of birth
- "insurance" = all patient insurance details
- "location" = hospital/facility name
- "dx" = diagnosis/medical condition
- "pcp" = primary doctor name
- "dc" = discharge information
- "wounds" = wound descriptions
- "antibiotics" = antibiotic medications
- "cardiacDrips" = heart medications
- "labs" = test results
- "faceToFace" = in-person evaluations
- "history" = patient medical history
- "mentalHealthState" = psychological status
- "additionalComments" = other relevant details

For missing information, use empty string "".
Only output valid JSON with these exact fields.`;

    // Enhanced system prompt with medical domain knowledge, focused on patient info
    this.systemPrompt = `You are a medical information extraction assistant specializing in clinical documents.
Your sole purpose is to extract structured medical information from documents.
You understand medical terminology, abbreviations, and can recognize clinical concepts.

CRITICAL FIELDS:
- patientName: Look for full names, often near "Patient:", "Name:", or at the top of the document
- patientDOB: Look for birthdate in various formats (MM/DD/YYYY, DD-MM-YYYY, etc.), often labeled as "DOB", "Birth Date", etc.

Common medical abbreviations:
- Dx = Diagnosis
- PCP = Primary Care Provider 
- DC = Discharge
- Hx = History
- Tx = Treatment
- Rx = Prescription
- Sx = Symptoms
- PM&R = Physical Medicine and Rehabilitation

Always return a JSON object with exactly the requested field names.
If information is not found, include the field with an empty string.
Do not make up information that isn't present in the document.`;

    // To track extraction progress
    this.extractionProgress = {
      status: 'idle',
      progress: 0,
      currentStep: '',
      message: ''
    };
    this.progressCallback = null;
  }

  static getInstance() {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
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
    this.baseUrl = url.trim();
    console.log('Ollama base URL set to:', this.baseUrl);
  }

  /**
   * Set the default model to use
   */
  setDefaultModel(model) {
    this.defaultModel = model.trim() || 'llama3.2:1b';
    console.log('Ollama default model set to:', this.defaultModel);
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
   * Test the connection to the Ollama server
   */
  async testConnection() {
    console.log('Testing connection to Ollama server:', `${this.baseUrl}/api/version`);
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        // Add timeout to prevent hanging
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
   * Initialize the service by finding the llama3.2:1b model or a fallback
   */
  async initialize() {
    console.log('Initializing OllamaService with Llama 3.2 1B...');
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
            console.log(`Using model: ${this.defaultModel}`);
            return true;
          }
        }
        
        // If none of the preferred models found, use the first available one
        this.defaultModel = models[0];
        console.log(`Using available model: ${this.defaultModel}`);
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
    model = this.defaultModel,
    systemPrompt = this.systemPrompt,
    options = {}
  ) {
    if (!model) {
      model = this.defaultModel;
    }
    
    console.log(`Generating completion with model: ${model}`);
    console.log(`Prompt length: ${prompt.length} characters`);
    
    try {
      // Current API format for Ollama
      const requestData = {
        model,
        prompt,
        // In newer Ollama versions, options are at the top level
        temperature: options.temperature || 0.1, // Lower temperature for extraction tasks
        top_p: options.top_p || 0.9,
        top_k: options.top_k || 40,
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
   * Generate semantic embeddings for text
   * Used for similarity comparisons and reference tracking
   */
  async generateEmbeddings(text, model = this.defaultModel) {
    if (!model) {
      model = this.defaultModel;
    }
    
    // Limit text length for embeddings to avoid performance issues
    const processedText = text.length > 8000 ? text.substring(0, 8000) : text;
    
    console.log(`Generating embeddings with model: ${model}`);
    console.log(`Text length for embeddings: ${processedText.length} characters`);
    
    try {
      // Try first API format (newer versions)
      const requestData = {
        model,
        prompt: processedText,
      };

      const requestUrl = `${this.baseUrl}/api/embeddings`;
      console.log('Sending embeddings request to:', requestUrl);
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        // If embedding endpoint fails, try the alternative embed endpoint that some Ollama versions use
        console.warn('Embeddings endpoint failed, trying alternate endpoint');
        return this.generateEmbeddingsAlternate(processedText, model);
      }

      const data = await response.json();
      console.log('Embeddings response received, processing...');
      
      // Handle different response formats for embeddings
      if (data.embedding) {
        console.log('Embedding vector length:', data.embedding.length);
        return data.embedding;
      } else if (data.embeddings && Array.isArray(data.embeddings) && data.embeddings.length > 0) {
        console.log('Embedding vector length:', data.embeddings[0].length);
        return data.embeddings[0];
      } else if (Array.isArray(data) && data.length > 0) {
        console.log('Embedding vector length:', data.length);
        return data;
      } else {
        console.warn('Unexpected embeddings response format:', data);
        
        // Fallback to simple random embeddings (only for demonstration)
        console.warn('Falling back to random embeddings');
        return this.generateRandomEmbeddings(128);
      }
    } catch (error) {
      console.error('Ollama embeddings error:', error);
      
      // Try alternate endpoint on error
      try {
        return await this.generateEmbeddingsAlternate(processedText, model);
      } catch (alternateError) {
        console.error('Alternate embeddings approach also failed:', alternateError);
        
        // Return random embeddings as last resort fallback
        console.warn('Falling back to random embeddings');
        return this.generateRandomEmbeddings(128);
      }
    }
  }
  
  /**
   * Alternative approach to generate embeddings
   * Some Ollama versions use a different endpoint or format
   */
  async generateEmbeddingsAlternate(text, model) {
    try {
      // Try alternate endpoint format
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
        throw new Error(`Alternate embeddings failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.embedding) {
        return data.embedding;
      } else if (data.embeddings) {
        return data.embeddings;
      } else {
        throw new Error('No embeddings found in response');
      }
    } catch (error) {
      console.error('Alternative embeddings approach failed:', error);
      throw error;
    }
  }

  /**
   * Generate random embeddings as a fallback
   * Only used when real embeddings can't be obtained
   */
  generateRandomEmbeddings(dimensions = 128) {
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
   * Extract structured information from text - optimized for long documents
   */
  async extractInformation(text, schema = null, model = this.defaultModel) {
    try {
      // Update progress - starting
      this.updateProgress(
        'processing', 
        0.3, 
        'Starting AI analysis',
        'Preparing document for AI extraction'
      );
      
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
          
          // Process each chunk
          const chunkResult = await this.processSingleChunk(chunks[i], schema, model);
          chunkResults.push(chunkResult);
          
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
        return this.processSingleChunk(text, schema, model);
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
        timestamp: new Date().toISOString()
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
   * Process a single chunk of text
   */
  async processSingleChunk(text, schema, model) {
    // If no schema is provided, extract schema from the extraction prompt
    if (!schema) {
      schema = this.parseSchemaFromPrompt(this.extractionPrompt);
    }
    
    // Create the combined prompt
    const combinedPrompt = `${this.extractionPrompt}

TEXT TO EXTRACT FROM:
${text}`;
    
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
    
    // Process the result to extract JSON
    try {
      // Find the first { and last } in the response to extract just the JSON part
      const jsonStart = result.indexOf('{');
      const jsonEnd = result.lastIndexOf('}') + 1;
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonStr = result.substring(jsonStart, jsonEnd);
        
        try {
          const parsedResult = JSON.parse(jsonStr);
          console.log('Successfully parsed JSON result');
          
          // Update progress - parsing successful
          this.updateProgress(
            'processing', 
            0.75, 
            'Information extracted',
            'Successfully parsed structured data'
          );
          
          // Validate and format the extracted fields
          return this.validateAndFormatFields(parsedResult);
        } catch (jsonError) {
          console.error('Failed to parse extracted JSON:', jsonError);
          
          // Update progress - parsing failed
          this.updateProgress(
            'error', 
            0.7, 
            'Parsing error',
            'Failed to parse AI output as JSON'
          );
          
          // Return basic error object
          return {
            extractionMethod: 'failed',
            error: 'JSON parsing error',
            errorDetails: jsonError.message,
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Additional error handling...
      console.error('No JSON found in result');
      
      // Update progress - no JSON found
      this.updateProgress(
        'error', 
        0.7, 
        'Format error',
        'AI output did not contain valid JSON'
      );
      
      return {
        extractionMethod: 'failed',
        error: 'No JSON found in model response',
        timestamp: new Date().toISOString()
      };
    } catch (parseError) {
      console.error('Failed to parse extracted information:', parseError);
      
      // Update progress - parsing error
      this.updateProgress(
        'error', 
        0.7, 
        'Processing error',
        `Failed to extract structured data: ${parseError.message}`
      );
      
      // Return error information
      return {
        extractionMethod: 'failed',
        error: 'Parsing error',
        errorDetails: parseError.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Merge results from multiple chunks with smarter handling of fields
   */
  mergeChunkResults(results) {
    const mergedResult = {
      extractionMethod: 'ai',
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

  /**
   * Validate and format extracted fields to ensure consistency
   */
  validateAndFormatFields(extractedData) {
    // Define the expected fields
    const expectedFields = [
      'patientName',
      'patientDOB',
      'insurance',
      'location',
      'dx',
      'pcp',
      'dc',
      'wounds',
      'antibiotics',
      'cardiacDrips',
      'labs',
      'faceToFace',
      'history',
      'mentalHealthState',
      'additionalComments'
    ];
    
    // Create a properly formatted output object
    const formattedOutput = {
      extractionMethod: 'ai',
      extractionDate: new Date().toISOString()
    };
    
    // Ensure all expected fields exist
    expectedFields.forEach(field => {
      // If the field exists in extracted data, use it, otherwise empty string
      formattedOutput[field] = extractedData[field] || '';
      
      // Trim whitespace
      if (typeof formattedOutput[field] === 'string') {
        formattedOutput[field] = formattedOutput[field].trim();
      }
    });
    
    // Handle possible field name variations
    const fieldMappings = {
      'patient_name': 'patientName',
      'patient': 'patientName',
      'fullName': 'patientName',
      'name': 'patientName',
      'date_of_birth': 'patientDOB',
      'dateOfBirth': 'patientDOB',
      'dob': 'patientDOB',
      'birthdate': 'patientDOB',
      'insurance_provider': 'insurance',
      'insuranceProvider': 'insurance',
      'primaryInsurance': 'insurance',
      'diagnosis': 'dx',
      'discharge': 'dc',
      'provider': 'pcp',
      'primaryCareProvider': 'pcp',
      'woundCare': 'wounds',
      'antibioticTherapy': 'antibiotics',
      'cardiacMedications': 'cardiacDrips',
      'laboratory': 'labs',
      'labResults': 'labs',
      'faceToFaceEncounter': 'faceToFace',
      'medicalHistory': 'history',
      'mentalHealth': 'mentalHealthState',
      'additional': 'additionalComments',
      'notes': 'additionalComments'
    };
    
    // Check for alternative field names and map them
    Object.entries(fieldMappings).forEach(([altField, standardField]) => {
      if (extractedData[altField] && !formattedOutput[standardField]) {
        formattedOutput[standardField] = extractedData[altField];
      }
    });
    
    console.log('Validated fields:', Object.keys(formattedOutput).filter(k => 
      !k.startsWith('_') && k !== 'extractionMethod' && k !== 'extractionDate'
    ));
    
    return formattedOutput;
  }

  /**
   * Parse schema from extraction prompt
   * This helps extract the schema from the prompt when not provided directly
   */
  parseSchemaFromPrompt(prompt) {
    const schema = {};
    
    // Extract schema lines from the prompt (lines starting with - followed by field: description)
    const schemaLines = prompt.match(/- ([a-zA-Z0-9_]+):\s+([^\n]+)/g);
    
    if (schemaLines) {
      schemaLines.forEach(line => {
        const match = line.match(/- ([a-zA-Z0-9_]+):\s+(.+)/);
        if (match) {
          const [, field, description] = match;
          schema[field] = description;
        }
      });
    }
    
    return schema;
  }

  /**
   * Find the most similar text sections using embeddings
   * Used for semantic search and reference identification
   */
  async findSimilarSections(query, sections, model = this.defaultModel, topK = 3) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbeddings(query, model);
      
      // Calculate similarity scores for each section
      const scoredSections = await Promise.all(sections.map(async (section) => {
        // Generate embedding for the section if not already present
        const sectionEmbedding = section.embedding || await this.generateEmbeddings(section.text, model);
        
        // Calculate similarity score
        const score = this.cosineSimilarity(queryEmbedding, sectionEmbedding);
        
        return {
          ...section,
          embedding: sectionEmbedding,
          score
        };
      }));
      
      // Sort sections by similarity score (highest first)
      const sortedSections = scoredSections.sort((a, b) => b.score - a.score);
      
      // Return top K sections
      return sortedSections.slice(0, topK);
    } catch (error) {
      console.error('Error finding similar sections:', error);
      return sections.slice(0, topK);
    }
  }

  /**
   * Determine the type of a section based on its content
   * Used for categorizing references
   */
  determineSectionType(text) {
    const lowerText = text.toLowerCase();
    
    // Check for common section types in medical documents
    if (lowerText.includes('patient') && (lowerText.includes('information') || lowerText.includes('details'))) {
      return 'Patient Information';
    }
    
    if (lowerText.includes('referring') && (lowerText.includes('physician') || lowerText.includes('doctor'))) {
      return 'Referring Physician';
    }
    
    if (lowerText.includes('diagnosis') || lowerText.includes('assessment') || lowerText.includes('impression')) {
      return 'Diagnosis';
    }
    
    if (lowerText.includes('history')) {
      return 'Medical History';
    }
    
    if (lowerText.includes('medication') || lowerText.includes('prescription')) {
      return 'Medications';
    }
    
    if (lowerText.includes('insurance')) {
      return 'Insurance Information';
    }
    
    if (lowerText.includes('reason') && lowerText.includes('referral')) {
      return 'Referral Reason';
    }
    
    // Default section type
    return 'Document Section';
  }
}

export default OllamaService;