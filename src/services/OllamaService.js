/**
 * Debug OllamaService - Add logging to understand why extraction is empty
 */
import MedicalFieldService from './MedicalFieldService';

class OllamaService {
  static instance;

  constructor() {
    this.baseUrl = 'http://localhost:11434';
    this.defaultModel = 'monotykamary/medichat-llama3';
    this.fallbackModel = 'llama3.2:1b';
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
   * DEBUG: Enhanced system prompt with more guidance
   */
  getSystemPrompt() {
    return `You are a medical AI assistant specialized in extracting information from clinical documents.

TASK: Read the medical document carefully and extract specific information into 15 numbered fields.

OUTPUT FORMAT RULES:
- Each line starts with: NUMBER|EXTRACTED_INFORMATION
- Extract real information from the document
- Do not leave fields empty unless truly no information exists
- Look carefully for patient names, dates, diagnoses, medications, etc.
- Do not include the text in the format example, just the extracted data
- Use the pipe symbol (|) to separate the number from the content
- Ensure the content is relevant to the field number. Do not skip fields.

FORMAT EXAMPLE:
1|John Smith
2|01/15/1980
3|Medicare Part A
4|General Hospital
5|Type 2 Diabetes
6|Dr. Sarah Johnson
7|Home with follow-up
8|No acute findings
9|Metformin 500mg BID
10|Lisinopril 10mg daily
11|A1C 7.2%, Glucose 140
12|Alert and oriented
13|Hypertension, diabetes
14|Normal cognition
15|Patient compliant with medications

FIELD DEFINITIONS:
1 = Patient's full name (look for names, patient identifiers)
2 = Date of birth or age (look for DOB, birth date, age)
3 = Insurance (Medicare, Medicaid, insurance company names)
4 = Medical facility (hospital name, clinic, medical center)
5 = Primary diagnosis (main medical condition, chief complaint)
6 = Primary care provider (doctor names, PCP, referring physician)
7 = Discharge disposition (where patient goes: home, facility, etc.)
8 = Physical findings (wounds, injuries, physical exam results)
9 = Medications (all drugs, prescriptions, treatments mentioned)
10 = Cardiac medications (heart-specific drugs only)
11 = Laboratory data (lab results, vital signs, test values)
12 = Physical examination (examination notes, assessments)
13 = Medical history (past conditions, previous medical issues)
14 = Mental status (cognitive state, mental health notes)
15 = Additional notes (other important clinical information)

IMPORTANT: Extract actual information from the document. Do not return empty fields unless the information truly doesn't exist in the document.`;
  }

  /**
   * DEBUG: Enhanced document prompt with better instructions
   */
  getCoTPrompt(documentText) {
    // DEBUG: Log the document text being sent to AI

    
    return `Read this medical document carefully and extract the requested information:

MEDICAL DOCUMENT TEXT:
${documentText}

INSTRUCTIONS:
1. Read the entire document above
2. Look for patient information, medical details, diagnoses, medications, etc.
3. Extract information into the 15 numbered fields using pipe format
4. Put actual information after each pipe symbol
5. Only leave a field empty (NUMBER|) if that information truly doesn't exist

Extract the information now using the NUMBER|CONTENT format:`;
  }

  async generateCompletion(documentText) {
    // DEBUG: Check if document text is meaningful
    if (!documentText || documentText.trim().length < 50) {
      console.warn('DEBUG: Document text is very short or empty:', documentText);
    }
    
    this.updateProgress('processing', 0.4, 'Medical AI Analysis', `Using medichat-llama3 model`);
    
    try {
      return await this.tryModelGeneration(this.defaultModel, documentText);
    } catch (error) {
      console.warn('Medichat model failed, trying fallback:', error.message);
      this.updateProgress('processing', 0.45, 'Switching models', 'Trying alternative model');
      
      try {
        return await this.tryModelGeneration(this.fallbackModel, documentText);
      } catch (fallbackError) {
        throw new Error(`Both models failed: ${error.message}, ${fallbackError.message}`);
      }
    }
  }

  async tryModelGeneration(modelName, documentText) {
    // DEBUG: More balanced parameters - not too restrictive
    const requestData = {
      model: modelName,
      prompt: this.getCoTPrompt(documentText),
      system: this.getSystemPrompt(),
      temperature: 0.1, // Slightly higher to encourage extraction
      stream: false,
      options: {
        num_predict: 3000,  // More tokens for detailed extraction
        num_ctx: 8192,
        top_k: 20,         // Less restrictive to allow medical terminology
        top_p: 0.4,        // Less restrictive for better extraction
        repeat_penalty: 1.1,
        stop: ["16|", "END", "---"],
        seed: 42
      }
    };

    // DEBUG: Log the request being sent
    console.log('DEBUG: Sending request to model:', modelName);
    console.log('DEBUG: Request parameters:', JSON.stringify(requestData.options, null, 2));

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.updateProgress('processing', 0.7, 'Medical analysis complete', 'Extracted clinical information');
    
    // DEBUG: Log the full response
    console.log('DEBUG: Full AI Response:', data.response);
    console.log('DEBUG: Response length:', (data.response || '').length);
    
    return data.response || JSON.stringify(data);
  }

  async extractInformation(text) {
    try {
      this.updateProgress('processing', 0.3, 'Starting medical analysis', 'Preparing document for medichat AI');
      
      // DEBUG: Log the text being processed
      console.log('DEBUG: Text being processed for extraction:');
      console.log('Text length:', text.length);
      console.log('Text preview:', text.substring(0, 200) + '...');
      
      const result = await this.generateCompletion(text);
      
      try {
        const extractedData = this.parseDelimiterResponse(result);
        
        // DEBUG: Log extraction results
        console.log('DEBUG: Extraction results:');
        Object.entries(extractedData).forEach(([key, value]) => {
          if (value && typeof value === 'string' && value.trim()) {
            console.log(`DEBUG: ${key} = "${value}"`);
          }
        });
        
        this.updateProgress('processing', 0.9, 'Medical extraction complete', 'Successfully extracted clinical data');
        return extractedData;
      } catch (parseError) {
        console.error('DEBUG: Parse error:', parseError);
        this.updateProgress('error', 0.7, 'Medical parsing error', `Failed to extract: ${parseError.message}`);
        
        return {
          extractionMethod: 'failed',
          error: 'Medical parsing error',
          errorDetails: parseError.message,
          rawOutput: result,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('DEBUG: Extraction error:', error);
      this.updateProgress('error', 0.5, 'Medical extraction failed', `Error: ${error.message}`);
      return {
        extractionMethod: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
        rawOutput: error.rawOutput || '',
      };
    }
  }

  parseDelimiterResponse(text) {
    console.log('DEBUG: Parsing AI response...');
    console.log('DEBUG: Raw response:', text);
    
    const result = this.medicalFieldService.createEmptyFormData();
    result.extractionMethod = 'medichat-parsed';
    
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

  isValidMedicalContent(content, fieldNumber) {
    if (!content || content.length < 1) {
      console.log(`DEBUG: Content empty or too short: "${content}"`);
      return false;
    }
    
    const invalidPatterns = [
      /^(not found|none|n\/a|unknown|not specified|not mentioned)$/i,
      /^(no|null|undefined|empty)$/i,
      /^\[.*\]$/, // Bracketed instructions
      /^extract:/i, // Instruction remnants
      /^(here|content|info|information)$/i // Generic placeholders
    ];
    
    const isInvalid = invalidPatterns.some(pattern => pattern.test(content.trim()));
    if (isInvalid) {
      console.log(`DEBUG: Content matches invalid pattern: "${content}"`);
    }
    
    return !isInvalid;
  }

  cleanMedicalContent(content) {
    const cleaned = content
      .replace(/^\[|\]$/g, '') // Remove brackets
      .replace(/^Extract:\s*/i, '') // Remove instruction prefixes
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/^[:\-\s]+|[:\-\s]+$/g, '') // Remove leading/trailing colons and dashes
      .trim();
    
   
    return cleaned;
  }
}

export default OllamaService;