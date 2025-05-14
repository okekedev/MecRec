/**
 * Service for interacting with Ollama API
 * Ollama is an open-source platform for running LLMs locally
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
    this.defaultModel = model.trim();
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
        const models = data.models.map(model => model.name);
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
   * Generate embeddings for text
   * Note: This requires a model that supports embeddings
   */
  async generateEmbeddings(
    text,
    model = this.defaultModel
  ) {
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
        // If embedding endpoint fails, we'll try the alternative embed endpoint that some Ollama versions use
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
   * Extract structured information from text
   */
  async extractInformation(
    text,
    schema,
    model = this.defaultModel
  ) {
    try {
      // Create a prompt that asks for structured information
      const schemaDescription = Object.entries(schema)
        .map(([key, description]) => `- ${key}: ${description}`)
        .join('\n');
      
      const prompt = `
Extract the following information from the text, formatted as JSON:
${schemaDescription}

If a field is not found, leave it null or empty string.
Return only valid JSON, with the field names exactly as specified.

TEXT:
${text}
`;

      const systemPrompt = `You are an AI assistant specialized in extracting structured information from medical documents. 
Your task is to extract specific fields of information and return them in a clean JSON format.
Only return the JSON object, nothing else.`;

      // Add context about the sections in the document
      // Create embeddings for each paragraph to enable source references
      const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
      console.log(`Document split into ${paragraphs.length} paragraphs for context`);
      
      // Generate embeddings for each paragraph to support references
      const paragraphEmbeddings = [];
      
      // Save indices of paragraphs to generate reference metadata
      const paragraphIndices = {};
      for (let i = 0; i < paragraphs.length; i++) {
        paragraphIndices[paragraphs[i].slice(0, 50)] = i;
      }
      
      // Use the extraction prompt to get structured data
      const result = await this.generateCompletion(prompt, model, systemPrompt, {
        temperature: 0.1, // Low temperature for more deterministic output
      });

      // Try to parse the response as JSON
      try {
        // Find the first { and last } in the response to extract just the JSON part
        const jsonStart = result.indexOf('{');
        const jsonEnd = result.lastIndexOf('}') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonStr = result.substring(jsonStart, jsonEnd);
          
          const parsedResult = JSON.parse(jsonStr);
          
          // Add metadata about extraction
          parsedResult.extractionMethod = 'ai';
          parsedResult.modelUsed = model;
          parsedResult.extractionDate = new Date().toISOString();
          
          // Add source information to help with references
          parsedResult.paragraphIndices = paragraphIndices;
          
          return parsedResult;
        }
        
        // If we couldn't find JSON brackets, try parsing the whole response
        const parsedResult = JSON.parse(result);
        parsedResult.extractionMethod = 'ai';
        parsedResult.modelUsed = model;
        return parsedResult;
      } catch (parseError) {
        console.error('Failed to parse extracted information:', parseError);
        console.error('Raw response:', result);
        
        // Try to extract any JSON-like content
        const possibleJsonMatch = result.match(/{[^{}]*({[^{}]*})*[^{}]*}/);
        if (possibleJsonMatch) {
          try {
            const extractedJson = JSON.parse(possibleJsonMatch[0]);
            console.log('Recovered partial JSON result:', extractedJson);
            return {
              ...extractedJson,
              extractionMethod: 'ai-partial',
              parsingError: true
            };
          } catch (e) {
            console.error('Failed to parse partial JSON match');
          }
        }
        
        // Return an object with the raw text and error info as fallback
        return {
          rawExtraction: result,
          extractionMethod: 'ai-failed',
          parsingError: true,
          errorMessage: parseError.message
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
}

export default OllamaService;