/**
 * Simplified OllamaService - Clean NUMBER| parsing with pipe delimiters
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
   * Explicit prompt with clear field assignments
   */
  getSystemPrompt() {
    return `Extract medical information from referral documents. Return exactly 15 fields using pipe delimiters. Put the RIGHT information in each field number. Use pipes after numbers to seperate fields rather than periods or commas.

REQUIRED FORMAT WITH SPECIFIC FIELD ASSIGNMENTS:
1| [Extract: Patient's full name from document header/top]
2| [Extract: Date of birth, DOB, or birth date in any format]
3| [Extract: Insurance provider, Medicare, Medicaid, policy details]
4| [Extract: Hospital name, clinic, medical facility location]
5| [Extract: Primary diagnosis, main condition, chief complaint]
6| [Extract: Doctor's name, PCP, referring physician, MD name]
7| [Extract: Discharge plans, follow-up instructions, where patient goes next]
8| [Extract: Physical injuries, wounds, fractures, trauma, physical findings]
9| [Extract: ALL medications, drugs, prescriptions, antibiotics mentioned]
10| [Extract: Heart medications, cardiac drugs, IV drips, cardiac-specific meds]
11| [Extract: Lab results, blood work, vital signs, test values]
12| [Extract: Physical examination notes, face-to-face evaluation, assessment]
13| [Extract: Past medical history, previous conditions, medical background]
14| [Extract: Mental status, psychological state, cognitive assessment]
15| [Extract: Other clinical notes, additional observations, miscellaneous]


Your response must start with "1|" and assign information to the CORRECT field numbers.`;
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
          stop: ["16|", "END"],
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
   * Super simple parsing: NUMBER| to next NUMBER| (or end)
   * Capture everything in between - let AI handle the formatting
   */
  parseDelimiterResponse(text) {
    console.log('Raw AI Response:', text);
    
    const result = this.medicalFieldService.createEmptyFormData();
    result.extractionMethod = 'delimiter-parsed';
    
    // Simple regex: capture from NUMBER| to next NUMBER| (or end of text)
    const pattern = /(\d+)\|(.*?)(?=\d+\||$)/gs;
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