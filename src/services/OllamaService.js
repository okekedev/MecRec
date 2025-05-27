/**
 * Simplified OllamaService - Using $$ delimiter for clean parsing
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
   * System prompt with $ delimiter for simple parsing - MUST complete all 15 fields
   */
  getSystemPrompt() {
    return `You are a medical information extraction assistant. You MUST extract information and return ALL 15 numbered items using the $ delimiter. DO NOT STOP until you complete all 15 fields.

RETURN FORMAT - Use $ after each number (COMPLETE ALL 15):
1$ Patient Name Here
2$ Date of Birth Here  
3$ Insurance Information Here
4$ Location/Facility Here
5$ Diagnosis Here
6$ Primary Care Provider Here
7$ Discharge Information Here
8$ Wounds/Injuries Here
9$ Medications & Antibiotics Here
10$ Cardiac Medications/Drips Here
11$ Labs & Vital Signs Here
12$ Face-to-Face Evaluations Here
13$ Medical History Here
14$ Mental Health State Here
15$ Additional Comments Here

CRITICAL RULES:
- ALWAYS complete ALL 15 fields - never stop early
- ALWAYS use the exact format: NUMBER$ CONTENT
- If information doesn't exist, write: NUMBER$ Not found
- Write the actual extracted information after $
- Continue until you reach 15$ - DO NOT STOP AT 11 or any other number
- Extract DOB in any format found (MM/DD/YYYY, DD-MM-YYYY, etc.)
- For Medications: Include ALL drugs, prescriptions, antibiotics mentioned
- For Labs and Vitals: Include both lab results AND vital signs

YOU MUST COMPLETE ALL 15 NUMBERED ITEMS. DO NOT STOP EARLY.

Medical abbreviations:
Dx = Diagnosis, PCP = Primary Care Provider, DC = Discharge, BP = Blood Pressure, HR = Heart Rate, O2 = Oxygen`;
  }

  async generateCompletion(documentText) {
    this.updateProgress('processing', 0.4, 'Analyzing document', `Running AI model: ${this.defaultModel}`);
    
    try {
      const requestData = {
        model: this.defaultModel,
        prompt: documentText,
        system: this.getSystemPrompt(),
        temperature: 0.0, // Maximum consistency
        stream: false,
        options: {
          num_predict: 2000,        // Maximum tokens to generate (increase this!)
          num_ctx: 32768,           // Context window size
          top_k: 1,                 // Most deterministic
          top_p: 0.1,               // Low for consistency
          repeat_penalty: 1.0,      // No repetition penalty
          stop: ["16$", "END"]     // Stop if it tries to add extra fields
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

  // MUCH SIMPLER AND MORE ROBUST: Parse using $ delimiter
  parseDelimiterResponse(text) {
    console.log('Raw AI Response:', text); // Debug logging
    
    const result = this.medicalFieldService.createEmptyFormData();
    result.extractionMethod = 'delimiter-parsed';
    
    // Use regex to match: number$ followed by content until next number$ or end
    const pattern = /(\d+)\$\$(.*?)(?=\d+\$\$|$)/gs;
    const matches = [...text.matchAll(pattern)];
    
    console.log(`Found ${matches.length} field matches`); // Debug logging
    
    matches.forEach(match => {
      const number = parseInt(match[1], 10);
      const content = match[2].trim();
      console.log(`Field ${number}: "${content}"`); // Debug logging
      
      const field = this.medicalFieldService.getFieldByNumber(number);
      
      if (field && number >= 1 && number <= 15) {
        // Store content unless it's explicitly "not found"
        if (content && 
            !content.toLowerCase().includes('not found') && 
            !content.toLowerCase().includes('no information') &&
            content.length > 0) {
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