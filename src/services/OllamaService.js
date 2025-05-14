/**
 * Enhanced OllamaService with improved handling for embeddings and reference tracking
 */
class OllamaService {
  static instance;

  constructor() {
    this.baseUrl = 'http://localhost:11434';
    this.defaultModel = 'llama3.2';
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
   * Get the current configuration
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
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
    systemPrompt,
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
  async extractInformation(text, schema, model = this.defaultModel) {
    try {
      // Create a prompt that asks for structured information with explicit JSON formatting
      const schemaDescription = Object.entries(schema)
        .map(([key, description]) => `- ${key}: ${description}`)
        .join('\n');
      
      const prompt = `
Extract the following information from the text into a JSON object:
${schemaDescription}

VERY IMPORTANT: Your response must be a valid JSON object that can be parsed with JSON.parse().
If a field is not found, set it to null or an empty string.
Do not include any explanatory text, markdown, or comments outside the JSON structure.

TEXT:
${text}

Response format must be EXACTLY like this:
{
  "fieldName1": "extracted value",
  "fieldName2": "extracted value",
  "_references": {
    "fieldName1": {
      "text": "The text snippet where this information was found",
      "location": "The section name where this was found"
    },
    "fieldName2": { ... }
  }
}

Do not include any text before or after the JSON. Return only the JSON object.
`;

      const systemPrompt = `You are an AI assistant specialized in extracting structured information from medical documents. 
Your task is to extract specific fields of information and return them in a clean, valid JSON format.
Return ONLY the JSON object with no additional text, ensuring it can be parsed directly with JSON.parse().`;

      // Process text to find potential paragraph boundaries for references
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      console.log(`Document split into ${paragraphs.length} paragraphs for reference tracking`);
      
      // Use extraction prompt to get structured data
      const result = await this.generateCompletion(prompt, model, systemPrompt, {
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
            
            // If no _references field was created, add it
            if (!parsedResult._references) {
              parsedResult._references = {};
              
              // Try to create references for each field
              for (const [field, value] of Object.entries(parsedResult)) {
                // Skip metadata fields or empty values
                if (field.startsWith('_') || value === null || value === undefined || value === '') {
                  continue;
                }
                
                // Find a paragraph containing this value
                const containingParagraph = paragraphs.find(p => 
                  p.includes(value) || 
                  (typeof value === 'string' && p.toLowerCase().includes(value.toLowerCase()))
                );
                
                if (containingParagraph) {
                  parsedResult._references[field] = {
                    text: containingParagraph,
                    location: this.determineSectionType(containingParagraph),
                    value: value
                  };
                }
              }
            }
            
            return parsedResult;
          } catch (jsonError) {
            console.error('Failed to parse extracted JSON:', jsonError);
            console.log('Problematic JSON string:', jsonStr);
            // Continue to fallback methods
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
          // Continue to fallback methods
        }
        
        // Try to extract any JSON-like content using a more forgiving regex
        const possibleJsonMatch = result.match(/{[\s\S]*}/);
        if (possibleJsonMatch) {
          try {
            const extractedJson = JSON.parse(possibleJsonMatch[0]);
            console.log('Recovered partial JSON result:', extractedJson);
            return {
              ...extractedJson,
              extractionMethod: 'ai-partial',
              parsingError: true
            };
          } catch (regexError) {
            console.error('Failed to parse regex-matched JSON:', regexError);
          }
        }
        
        // If all parsing attempts fail, fall back to extracting structured data manually
        console.warn('All JSON parsing attempts failed, using fallback extraction method');
        return this.extractStructuredDataFromText(result, schema, text, paragraphs);
        
      } catch (parseError) {
        console.error('Failed to parse extracted information:', parseError);
        console.error('Raw response:', result);
        
        // Fall back to structured data extraction
        return this.extractStructuredDataFromText(result, schema, text, paragraphs);
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
   * Extract structured data from text when JSON parsing fails
   * @param {string} result - Raw text from Ollama
   * @param {object} schema - Schema of fields to extract
   * @param {string} originalText - Original document text
   * @param {array} paragraphs - Paragraphs from the document
   * @returns {object} Extracted structured data
   */
  extractStructuredDataFromText(result, schema, originalText, paragraphs = []) {
    console.log('Using fallback extraction method for non-JSON response');
    
    // Create a basic structure matching the schema
    const extractedData = {};
    const references = {};
    
    // Initialize fields from schema with empty values
    Object.keys(schema).forEach(key => {
      extractedData[key] = '';
    });
    
    // Try to extract each field using patterns and the Ollama response
    for (const [field, description] of Object.entries(schema)) {
      // First try to find the field in the Ollama response
      // Look for patterns like "fieldName: value" or "fieldName is value"
      let fieldLabel = field.replace(/([A-Z])/g, ' $1').toLowerCase();
      const patterns = [
        new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`, 'i'),  // Look for "field": "value"
        new RegExp(`${fieldLabel}\\s*:\\s*([^\\n.,]+)`, 'i'),  // Look for field: value
        new RegExp(`${fieldLabel}\\s+is\\s+([^\\n.,]+)`, 'i'),  // Look for field is value
        new RegExp(`${description}\\s*:\\s*([^\\n.,]+)`, 'i'),  // Look for description: value
      ];
      
      // Try each pattern on the Ollama response
      for (const pattern of patterns) {
        const match = result.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          extractedData[field] = match[1].trim();
          break;
        }
      }
      
      // If we didn't find a value in the Ollama response, try the original text
      if (!extractedData[field] && originalText) {
        // Create field-specific patterns based on the schema
        const textPatterns = this.getFieldSpecificPatterns(field, description);
        
        // Try each pattern on the original text
        for (const pattern of textPatterns) {
          const match = originalText.match(pattern);
          if (match && match[1] && match[1].trim().length > 0) {
            extractedData[field] = match[1].trim();
            
            // Add reference for this field
            const matchContext = this.getTextSurroundingMatch(originalText, match[0], 100);
            references[field] = {
              text: matchContext,
              location: this.determineSectionType(matchContext),
              value: extractedData[field]
            };
            
            break;
          }
        }
      }
    }
    
    // Add metadata and references
    extractedData.extractionMethod = 'ai-fallback';
    extractedData.extractionDate = new Date().toISOString();
    extractedData._references = references;
    
    return extractedData;
  }
  
  /**
   * Get field-specific regex patterns for extraction
   * @param {string} field - Field name
   * @param {string} description - Field description
   * @returns {Array} Array of regex patterns
   */
  getFieldSpecificPatterns(field, description) {
    // Convert camelCase to space-separated words
    const fieldWords = field.replace(/([A-Z])/g, ' $1').toLowerCase();
    
    // Common patterns that work for most fields
    const commonPatterns = [
      new RegExp(`(?:${fieldWords}|${description})\\s*:\\s*([^\\n.,]+)`, 'i'),
      new RegExp(`(?:${fieldWords}|${description})\\s+is\\s+([^\\n.,]+)`, 'i'),
    ];
    
    // Field-specific patterns
    switch (field) {
      case 'patientName':
        return [
          /(?:patient(?:'s)?\s+name|name\s+of\s+patient)[\s:]+([^.\n,]+)/i,
          /(?:patient|name)[\s:]+([^.\n,]+)/i,
          ...commonPatterns
        ];
        
      case 'patientDOB':
      case 'dateOfBirth':
        return [
          /(?:date\s+of\s+birth|DOB|birth\s+date)[\s:]+([^.\n,]+)/i,
          /(?:born\s+on)[\s:]+([^.\n,]+)/i,
          ...commonPatterns
        ];
        
      case 'patientGender':
      case 'gender':
        return [
          /(?:gender|sex)[\s:]+([^.\n,]+)/i,
          /(?:gender|sex)[\s:]+(?:is|was)[\s:]+([^.\n,]+)/i,
          ...commonPatterns
        ];
        
      case 'diagnosis':
        return [
          /(?:diagnosis|assessment|impression)[\s:]+([^.\n]+)/i,
          /(?:diagnosed with|diagnoses include)[\s:]+([^.\n]+)/i,
          ...commonPatterns
        ];
        
      case 'referringPhysician':
        return [
          /(?:referring physician|referred by)[\s:]+([^.\n,]+)/i,
          /(?:dr\.|doctor)[\s:]+([^.\n,]+)/i,
          ...commonPatterns
        ];
        
      // Default case - use common patterns
      default:
        return commonPatterns;
    }
  }
  
  /**
   * Get text surrounding a match for context
   * @param {string} text - Full text
   * @param {string} match - The matched text
   * @param {number} charsBefore - Characters to include before match
   * @param {number} charsAfter - Characters to include after match
   * @returns {string} Text with surrounding context
   */
  getTextSurroundingMatch(text, match, charsBefore = 50, charsAfter = 50) {
    const index = text.indexOf(match);
    if (index === -1) return match;
    
    const start = Math.max(0, index - charsBefore);
    const end = Math.min(text.length, index + match.length + charsAfter);
    
    return text.substring(start, end);
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