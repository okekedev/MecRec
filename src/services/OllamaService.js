/**
 * Service for interacting with Ollama API
 * Ollama is an open-source platform for running LLMs locally
 */

class OllamaService {
  static instance;

  constructor() {
    this.baseUrl = 'http://localhost:11434';
    this.defaultModel = 'llama3';
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
    this.baseUrl = url;
  }

  /**
   * Set the default model to use
   */
  setDefaultModel(model) {
    this.defaultModel = model;
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
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      if (!response.ok) {
        throw new Error(`Failed to connect to Ollama server: ${response.statusText}`);
      }
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
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.models) {
        return data.models.map(model => model.name);
      }
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
    try {
      const requestData = {
        model,
        prompt,
        options: {
          ...options,
          stream: false,
        }
      };

      if (systemPrompt) {
        requestData.system = systemPrompt;
      }

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
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
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding || [];
    } catch (error) {
      console.error('Ollama embeddings error:', error);
      
      // Return empty array as fallback
      return [];
    }
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
          return JSON.parse(jsonStr);
        }
        
        // If we couldn't find JSON brackets, try parsing the whole response
        return JSON.parse(result);
      } catch (parseError) {
        console.error('Failed to parse extracted information:', parseError);
        console.error('Raw response:', result);
        
        // Return an empty object as fallback
        return {};
      }
    } catch (error) {
      console.error('Information extraction error:', error);
      return {};
    }
  }
}

export default OllamaService;