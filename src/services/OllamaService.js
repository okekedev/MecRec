/**
 * Enhanced OllamaService with improved handling for embeddings and reference tracking
 */
class OllamaService {
  static instance;

  constructor() {
  this.baseUrl = 'http://localhost:11434';
  this.defaultModel = 'llama3.2';
  
  // Store default prompts for extraction with the new fields added
  this.extractionPrompt = `Extract the following information from the text into a JSON object:
- patientName: Patient's full name
- patientDOB: Patient's date of birth
- primaryInsurance: Patient's primary insurance provider
- secondaryInsurance: Patient's secondary insurance provider (if any)
- location: Treatment or facility location
- dx: Diagnosis (Dx)
- pcp: Primary Care Provider (PCP)
- dc: Discharge (DC) information
- wounds: Information about wounds, wound care, or wound assessment
- antibiotics: Antibiotic medications and treatments
- cardiacDrips: Cardiac drips or cardiac medications
- labs: Laboratory results and values
- faceToFace: Face to face encounters or assessments
- history: Patient medical history
- mentalHealthState: Mental health status or assessments
- additionalComments: Additional notes or comments

If a field is not found, set it to null or an empty string.
Return ONLY a valid JSON object with the field names exactly as specified.`;

  this.systemPrompt = `You are an AI assistant specialized in extracting structured information from medical documents. 
Your task is to extract specific fields of information and return them in a clean, valid JSON format.
Return ONLY the JSON object with no additional text, ensuring it can be parsed directly with JSON.parse().`;
}

  static getInstance() {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
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
    this.defaultModel = model.trim() || 'llama3.2';
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
      const response = await fetch(`${this.baseUrl}/api/version`);
      
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
    
    if (!model) {
      throw new Error('No model specified for Ollama completion');
    }
    
    console.log(`Generating completion with model: ${model}`);
    console.log(`Prompt length: ${prompt.length} characters`);
    
    try {
      // Current API format for Ollama
      const requestData = {
        model,
        prompt,
        // In newer Ollama versions, options are at the top level
        temperature: options.temperature || 0.7,
        top_p: options.top_p,
        top_k: options.top_k,
        stream: false,
      };

      // Add system prompt if provided
      if (systemPrompt) {
        requestData.system = systemPrompt;
        console.log('Using system prompt, length:', systemPrompt.length);
      }

      const requestUrl = `${this.baseUrl}/api/generate`;
      console.log('Sending request to:', requestUrl);
      console.log('Request data:', JSON.stringify(requestData));
      
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
        
        // If the specified model doesn't exist, try a fallback model
        if (response.status === 404 && errorText.includes('model')) {
          console.log('Model not found, attempting fallback to any available model');
          const models = await this.getAvailableModels();
          
          if (models.length > 0) {
            const fallbackModel = models[0];
            console.log(`Trying fallback model: ${fallbackModel}`);
            
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
    
    console.log(`Generating embeddings with model: ${model}`);
    console.log(`Text length: ${text.length} characters`);
    
    try {
      // Try first API format (newer versions)
      const requestData = {
        model,
        prompt: text,
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
        return this.generateEmbeddingsAlternate(text, model);
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
        return await this.generateEmbeddingsAlternate(text, model);
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
   * Extract structured information from text using Ollama LLM
   * Used for form field extraction with reference tracking
   */
  async extractInformation(text, schema = null, model = this.defaultModel) {
    try {
      // If no schema is provided, extract schema from the extraction prompt
      if (!schema) {
        schema = this.parseSchemaFromPrompt(this.extractionPrompt);
      }
      
      // Create a prompt that asks for structured information with explicit JSON formatting
      const schemaDescription = Object.entries(schema)
        .map(([key, description]) => `- ${key}: ${description}`)
        .join('\n');
      
      // Use the extraction prompt from settings, but replace the schema if provided
      let prompt = this.extractionPrompt;
      
      // If schema was provided, replace the schema section in the prompt
      if (schema) {
        // Replace the schema part of the prompt
        prompt = prompt.replace(/Extract the following information.*?(\n\nIf a field is not found|Return ONLY)/s, 
          `Extract the following information from the text into a JSON object:\n${schemaDescription}`);
      }
      
      // Add the actual text to extract from at the end
      prompt += `\n\nTEXT:\n${text}`;
      
      // Use extraction prompt to get structured data
      const result = await this.generateCompletion(prompt, model, this.systemPrompt, {
        temperature: 0.1, // Low temperature for more deterministic output
      });

      // Try to parse the response as JSON with robust error handling
      try {
        // Find the first { and last } in the response to extract just the JSON part
        const jsonStart = result.indexOf('{');
        const jsonEnd = result.lastIndexOf('}') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonStr = result.substring(jsonStart, jsonEnd);
          
          try {
            const parsedResult = JSON.parse(jsonStr);
            
            // Add metadata about extraction
            parsedResult.extractionMethod = 'ai';
            parsedResult.modelUsed = model;
            parsedResult.extractionDate = new Date().toISOString();
            
            // Process text to find potential paragraph boundaries for references if _references is missing
            if (!parsedResult._references) {
              parsedResult._references = {};
              
              // Split text into paragraphs for reference tracking
              const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
              
              // Try to create references for each field
              for (const [field, value] of Object.entries(parsedResult)) {
                // Skip metadata fields or empty values
                if (field.startsWith('_') || value === null || value === undefined || value === '') {
                  continue;
                }
                
                // Find a paragraph containing this value
                const containingParagraph = typeof value === 'string' && 
                  paragraphs.find(p => 
                    p.includes(value) || p.toLowerCase().includes(value.toLowerCase())
                  );
                
                if (containingParagraph) {
                  parsedResult._references[field] = {
                    text: containingParagraph,
                    location: this.determineSectionType(containingParagraph),
                    value
                  };
                }
              }
            }
            
            return parsedResult;
          } catch (jsonError) {
            console.error('Failed to parse extracted JSON:', jsonError);
            console.log('Problematic JSON string:', jsonStr);
            
            // Return basic error object
            return {
              extractionMethod: 'failed',
              error: 'JSON parsing error',
              errorDetails: jsonError.message,
              timestamp: new Date().toISOString()
            };
          }
        }
        
        // If JSON extraction failed, try to parse the entire response
        try {
          const parsedResult = JSON.parse(result);
          parsedResult.extractionMethod = 'ai';
          parsedResult.modelUsed = model;
          return parsedResult;
        } catch (wholeParseError) {
          console.error('Failed to parse whole response as JSON:', wholeParseError);
          
          // Return a simplified error response
          return {
            extractionMethod: 'failed',
            error: 'Failed to parse AI response',
            errorType: 'parsing_error',
            timestamp: new Date().toISOString()
          };
        }
      } catch (parseError) {
        console.error('Failed to parse extracted information:', parseError);
        console.error('Raw response:', result);
        
        // Return error information
        return {
          extractionMethod: 'failed',
          error: 'Parsing error',
          errorDetails: parseError.message,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Information extraction error:', error);
      return {
        extractionMethod: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
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