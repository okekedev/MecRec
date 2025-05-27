/**
 * Simplified OllamaService - Process entire document at once using long context
 */
import MedicalFieldService from './MedicalFieldService';

class OllamaService {
  static instance;

  constructor() {
    this.baseUrl = 'http://localhost:11434';
    this.defaultModel = 'llama3.2:1b';
    this.medicalFieldService = MedicalFieldService.getInstance();
    this.progressCallback = null;
  }

  static getInstance() {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  updateProgress(status, progress, currentStep, message) {
    if (this.progressCallback) {
      this.progressCallback({
        status,
        progress,
        currentStep,
        message
      });
    }
  }

  setBaseUrl(url) {
    this.baseUrl = url.trim();
  }

  setDefaultModel(model) {
    this.defaultModel = model.trim() || 'llama3.2:1b';
  }

  getConfig() {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      systemPrompt: this.getSystemPrompt()
    };
  }

  /**
   * Complete system prompt in one place
   */
  getSystemPrompt() {
    return `You are a medical information extraction assistant. Extract information from medical documents and return EXACTLY 15 numbered items.

RETURN FORMAT - EXACTLY THIS:
1. Patient Name
2. Date of Birth  
3. Insurance Information
4. Location/Facility
5. Diagnosis (Dx)
6. Primary Care Provider (PCP)
7. Discharge (DC)
8. Wounds/Injuries
9. Medications & Antibiotics
10. Cardiac Medications/Drips
11. Labs & Vital Signs
12. Face-to-Face Evaluations
13. Medical History
14. Mental Health State
15. Additional Comments

RULES:
- Return ONLY the 15 numbered items above
- Write the extracted information directly after each number
- If information doesn't exist, write "Not found" 
- Be brief and direct
- No explanations or extra text
- Extract DOB in any format found (MM/DD/YYYY, DD-MM-YYYY, etc.)
- For Medications: Include ALL drugs, prescriptions, antibiotics mentioned
- For Labs and Vitals: Include both lab results AND vital signs (BP, temperature, pulse, oxygen levels)

Medical abbreviations:
Dx = Diagnosis, PCP = Primary Care Provider, DC = Discharge, Hx = History, BP = Blood Pressure, HR = Heart Rate, O2 = Oxygen, IV = Intravenous`;
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Ollama connection failed:', error);
      return false;
    }
  }

  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.models) {
        return data.models.map(model => model.name || model);
      } else if (Array.isArray(data)) {
        return data.map(model => model.name || model);
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get models:', error);
      return [];
    }
  }

  async initialize() {
    try {
      const isConnected = await this.testConnection();
      if (!isConnected) {
        return false;
      }
      
      // Simple check - just try to use the default model
      try {
        const response = await fetch(`${this.baseUrl}/api/show`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.defaultModel }),
        });
        
        return response.ok;
      } catch (error) {
        console.warn(`Model ${this.defaultModel} not available:`, error);
        return false;
      }
    } catch (error) {
      console.error('Error initializing:', error);
      return false;
    }
  }

  async generateCompletion(documentText, model = this.defaultModel) {
    this.updateProgress('processing', 0.4, 'Analyzing document', `Running AI model: ${model}`);
    
    try {
      const requestData = {
        model,
        prompt: documentText,
        system: this.getSystemPrompt(),
        temperature: 0.1,
        stream: false,
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.updateProgress('processing', 0.7, 'Analysis complete', 'Successfully extracted information');
      
      return data.response || JSON.stringify(data);
    } catch (error) {
      this.updateProgress('error', 0.4, 'Analysis failed', `Error: ${error.message}`);
      throw error;
    }
  }

  async extractInformation(text, schema = null, model = this.defaultModel) {
    try {
      this.updateProgress('processing', 0.3, 'Starting AI analysis', 'Preparing document for extraction');
      
      // Process entire document at once - take advantage of long context
      const result = await this.generateCompletion(text, model);
      
      try {
        const extractedData = this.parseNumberedListResponse(result);
        this.updateProgress('processing', 0.9, 'Information extracted', 'Successfully extracted structured data');
        return extractedData;
      } catch (parseError) {
        this.updateProgress('error', 0.7, 'Parsing error', `Failed to extract: ${parseError.message}`);
        
        return {
          extractionMethod: 'failed',
          error: 'Parsing error',
          errorDetails: parseError.message,
          rawOutput: result,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      this.updateProgress('error', 0.5, 'Extraction failed', `Error: ${error.message}`);
      return {
        extractionMethod: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
        rawOutput: error.rawOutput || '',
      };
    }
  }

  parseNumberedListResponse(text) {
    const result = this.medicalFieldService.createEmptyFormData();
    result.extractionMethod = 'numbered-list';
    
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Match: "1. Some content" or "1) Some content" or "1 Some content"
      const match = line.match(/^\s*(\d+)[\.\)\s]+(.+)$/);
      
      if (match) {
        const [, numberStr, content] = match;
        const number = parseInt(numberStr, 10);
        const field = this.medicalFieldService.getFieldByNumber(number);
        
        if (field && number >= 1 && number <= 15) {
          const trimmedContent = content.trim();
          
          // Only store if it's not "not found" and has actual content
          if (trimmedContent && !trimmedContent.toLowerCase().includes('not found') && trimmedContent.length > 0) {
            result[field.key] = trimmedContent;
          }
        }
      }
    }
    
    return result;
  }
}

export default OllamaService;