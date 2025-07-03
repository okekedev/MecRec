/**
 * AzureOpenAIService - Clean production version without debug statements
 */
import MedicalFieldService from './MedicalFieldService';

class AzureOpenAIService {
  static instance;

  constructor() {
    this.medicalFieldService = MedicalFieldService.getInstance();
    this.progressCallback = null;
    
    // Smart API endpoint detection
    this.apiEndpoint = this.getApiEndpoint();
  }

  static getInstance() {
    if (!AzureOpenAIService.instance) {
      AzureOpenAIService.instance = new AzureOpenAIService();
    }
    return AzureOpenAIService.instance;
  }

  /**
   * Smart API endpoint detection for development vs production
   */
  getApiEndpoint() {
    // Check if we're in Expo development environment (port 19006)
    const isExpoDev = typeof window !== 'undefined' && 
                     window.location && 
                     window.location.port === '19006';

    if (isExpoDev) {
      return 'http://localhost:3000/api/openai';
    } else {
      return '/api/openai';
    }
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

  /**
   * Extract information using API proxy
   */
  async extractInformation(text) {
    try {
      this.updateProgress('processing', 0.3, 'Starting AI analysis', 'Preparing document for Azure OpenAI');
      this.updateProgress('processing', 0.4, 'AI Analysis', 'Sending to Azure OpenAI via secure proxy');
      
      // Call our internal API instead of Azure directly
      const response = await fetch(`${this.apiEndpoint}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: text
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `HTTP ${response.status}: ${response.statusText}` 
        }));
        throw new Error(`API request failed: ${response.status} - ${errorData.error || errorData.details || 'Unknown error'}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.updateProgress('processing', 0.7, 'AI Complete', 'Processing extraction results');
        
        try {
          const extractedData = this.parseDelimiterResponse(result.extractedData);
          this.updateProgress('processing', 0.9, 'AI extraction complete', 'Successfully extracted clinical data');
          return extractedData;
          
        } catch (parseError) {
          this.updateProgress('error', 0.7, 'AI parsing error', `Failed to extract: ${parseError.message}`);
          
          return {
            extractionMethod: 'failed',
            error: 'AI parsing error',
            errorDetails: parseError.message,
            rawOutput: result.extractedData,
            timestamp: new Date().toISOString()
          };
        }
      } else {
        throw new Error(result.error || result.details || 'Extraction failed');
      }
      
    } catch (error) {
      // Enhanced error handling with endpoint information
      let errorMessage = error.message;
      if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
        errorMessage = `Cannot connect to API server at ${this.apiEndpoint}. `;
        
        if (this.apiEndpoint.includes('localhost:3000')) {
          errorMessage += 'Make sure API server is running: npm run api';
        } else {
          errorMessage += 'Check server status.';
        }
      }
      
      this.updateProgress('error', 0.5, 'AI extraction failed', errorMessage);
      return {
        extractionMethod: 'failed',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Parse delimiter response
   */
  parseDelimiterResponse(text) {
    const result = this.medicalFieldService.createEmptyFormData();
    result.extractionMethod = 'azure-openai-parsed';
    
    const pattern = /^(\d+)\s*\|\s*(.*?)$/gm;
    const matches = [...text.matchAll(pattern)];
    
    if (matches.length === 0) {
      result.extractionMethod = 'format_error';
      result.error = 'AI response did not follow required pipe delimiter format';
      return result;
    }
    
    matches.forEach((match) => {
      const number = parseInt(match[1], 10);
      let content = match[2].trim();
      
      if (this.isValidMedicalContent(content, number)) {
        const field = this.medicalFieldService.getFieldByNumber(number);
        
        if (field && number >= 1 && number <= 15) {
          content = this.cleanMedicalContent(content);
          result[field.key] = content;
        }
      }
    });
    
    return result;
  }

  /**
   * Validate medical content
   */
  isValidMedicalContent(content, fieldNumber) {
    if (!content || content.length < 1) {
      return false;
    }
    
    const invalidPatterns = [
      /^(not found|none|n\/a|unknown|not specified|not mentioned)$/i,
      /^(no|null|undefined|empty)$/i,
      /^\[.*\]$/,
      /^extract:/i,
      /^(here|content|info|information)$/i
    ];
    
    const isInvalid = invalidPatterns.some(pattern => pattern.test(content.trim()));
    return !isInvalid;
  }

  /**
   * Clean medical content
   */
  cleanMedicalContent(content) {
    const cleaned = content
      .replace(/^\[|\]$/g, '')
      .replace(/^Extract:\s*/i, '')
      .replace(/\s+/g, ' ')
      .replace(/^[:\-\s]+|[:\-\s]+$/g, '')
      .trim();
    
    return cleaned;
  }
}

export default AzureOpenAIService;