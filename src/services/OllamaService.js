/**
 * Simplified OllamaService - Clean NUMBER$$ parsing
 * Let the AI do the heavy lifting, keep parsing simple
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

  /**
   * Simple, effective prompt - explicit about using actual numbers
   */
  getSystemPrompt() {
    return `Extract medical information from referral documents. Return exactly 15 fields using the format shown below.

REQUIRED FORMAT (use actual numbers 1, 2, 3, etc.):
1$ Patient full name
2$ Date of birth
3$ Insurance information
4$ Healthcare facility/location
5$ Primary diagnosis/condition
6$ Primary care provider name
7$ Discharge plans/instructions
8$ Wounds, injuries, or physical findings
9$ Medications and antibiotics
10$ Cardiac medications or drips
11$ Laboratory results and vital signs
12$ Face-to-face evaluation notes
13$ Medical history summary
14$ Mental health assessment
15$ Additional clinical comments

CRITICAL: Use the actual numbers (1$, 2$, 3$, etc.) NOT the word "NUMBER".

RULES:
• Start with 1$ then 2$ then 3$ and so on
• Complete ALL 15 fields ending with 15$
• If no information found: write the number then $ then "Not found"

Example of what to write:
1$ John Smith
2$ 03/15/1975
3$ Medicare Part A

DO NOT write "NUMBER$" - write the actual numbers like "1$", "2$", "3$" etc.`;
  }

  async generateCompletion(documentText) {
    this.updateProgress('processing', 0.4, 'Analyzing document', `Running AI model: ${this.defaultModel}`);
    
    try {
      const requestData = {
        model: this.defaultModel,
        prompt: documentText,
        system: this.getSystemPrompt(),
        temperature: 0.1,
        stream: false,
        options: {
          num_predict: 3000,
          num_ctx: 8192,
          top_k: 10,
          top_p: 0.3,
          repeat_penalty: 1.1,
          stop: ["16$$", "END"],
          seed: 42
        }
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
      
      console.log('AI Response Length:', (data.response || '').length, 'characters');
      console.log('AI Response Preview:', (data.response || '').substring(0, 200) + '...');
      
      return data.response || JSON.stringify(data);
    } catch (error) {
      this.updateProgress('error', 0.4, 'Analysis failed', `Error: ${error.message}`);
      throw error;
    }
  }

  async extractInformation(text) {
    try {
      this.updateProgress('processing', 0.3, 'Starting AI analysis', 'Preparing document for extraction');
      
      const result = await this.generateCompletion(text);
      
      try {
        const extractedData = this.parseDelimiterResponse(result);
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

  /**
   * Super simple parsing: NUMBER$$ to next NUMBER$$ (or end)
   * Capture everything in between - let AI handle the formatting
   */
  parseDelimiterResponse(text) {
    console.log('Raw AI Response:', text);
    
    const result = this.medicalFieldService.createEmptyFormData();
    result.extractionMethod = 'delimiter-parsed';
    
    // Simple regex: capture from NUMBER$$ to next NUMBER$$ (or end of text)
    const pattern = /(\d+)\$\$(.*?)(?=\d+\$\$|$)/gs;
    const matches = [...text.matchAll(pattern)];
    
    console.log(`Found ${matches.length} field matches`);
    
    matches.forEach(match => {
      const number = parseInt(match[1], 10);
      const content = match[2].trim();
      console.log(`Field ${number}: "${content}"`);
      
      const field = this.medicalFieldService.getFieldByNumber(number);
      
      if (field && number >= 1 && number <= 15) {
        // Store content unless it's clearly "not found"
        if (content && 
            content.length > 0 &&
            !content.toLowerCase().includes('not found')) {
          result[field.key] = content;
          console.log(`✓ Stored: ${field.key} = "${content}"`);
        } else {
          console.log(`✗ Skipped: ${field.key} (empty or not found)`);
        }
      }
    });
    
    return result;
  }
}

export default OllamaService;