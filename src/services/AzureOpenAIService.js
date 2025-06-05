/**
 * AzureOpenAIService - Fixed to detect development vs production environment
 */
import MedicalFieldService from './MedicalFieldService';

class AzureOpenAIService {
  static instance;

  constructor() {
    this.medicalFieldService = MedicalFieldService.getInstance();
    this.progressCallback = null;
    
    // Smart API endpoint detection
    this.apiEndpoint = this.getApiEndpoint();
    
    console.log('🔐 AzureOpenAIService configured');
    console.log('📍 API Endpoint:', this.apiEndpoint);
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
      // Expo dev server - point to our separate API server on port 3000
      console.log('🛠️ Development mode detected: Using separate API server on port 3000');
      return 'http://localhost:3000/api/openai';
    } else {
      // Production or same-server development - use relative path
      console.log('🏭 Production mode detected: Using relative API path');
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
      
      console.log('DEBUG: Text being processed for extraction:');
      console.log('DEBUG: Text length:', text.length);
      console.log('DEBUG: API endpoint:', this.apiEndpoint);
      
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

      console.log('DEBUG: API response status:', response.status);

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
          
          console.log('DEBUG: Extraction successful');
          this.updateProgress('processing', 0.9, 'AI extraction complete', 'Successfully extracted clinical data');
          return extractedData;
          
        } catch (parseError) {
          console.error('DEBUG: Parse error:', parseError);
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
      console.error('DEBUG: Extraction error:', error);
      
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
   * Parse delimiter response (same logic as before)
   */
  parseDelimiterResponse(text) {
    console.log('DEBUG: Parsing Azure OpenAI response...');
    console.log('DEBUG: Raw response:', text);
    
    const result = this.medicalFieldService.createEmptyFormData();
    result.extractionMethod = 'azure-openai-parsed';
    
    const pattern = /^(\d+)\s*\|\s*(.*?)$/gm;
    const matches = [...text.matchAll(pattern)];
    
    console.log(`DEBUG: Found ${matches.length} pipe-delimited matches`);
    
    if (matches.length === 0) {
      console.error('DEBUG: No pipe format found in response');
      result.extractionMethod = 'format_error';
      result.error = 'AI response did not follow required pipe delimiter format';
      return result;
    }
    
    matches.forEach((match, index) => {
      const number = parseInt(match[1], 10);
      let content = match[2].trim();
      
      console.log(`DEBUG: Match ${index + 1}: Field ${number} = "${content}"`);
      
      if (this.isValidMedicalContent(content, number)) {
        const field = this.medicalFieldService.getFieldByNumber(number);
        
        if (field && number >= 1 && number <= 15) {
          content = this.cleanMedicalContent(content);
          result[field.key] = content;
          console.log(`DEBUG: ✓ Stored ${field.key} = "${content}"`);
        }
      } else {
        console.log(`DEBUG: ✗ Invalid content for field ${number}: "${content}"`);
      }
    });
    
    return result;
  }

  /**
   * Validate medical content
   */
  isValidMedicalContent(content, fieldNumber) {
    if (!content || content.length < 1) {
      console.log(`DEBUG: Content empty or too short: "${content}"`);
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
    if (isInvalid) {
      console.log(`DEBUG: Content matches invalid pattern: "${content}"`);
    }
    
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