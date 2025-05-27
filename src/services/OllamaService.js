/**
 * Simplified OllamaService - Single prompt approach
 * System prompt has all instructions, user prompt is just the document text
 */
class OllamaService {
  static instance;

  constructor() {
    this.baseUrl = 'http://localhost:11434';
    this.defaultModel = 'llama3.2:1b';
    this.fallbackModels = ['llama3:8b', 'llama3.1:8b', 'llama3.1:1b', 'tinyllama', 'phi', 'gemma:2b'];
    
    // Single comprehensive system prompt
    this.systemPrompt = `You are a medical information extraction assistant. Extract information from medical documents and return EXACTLY 15 numbered items.

RETURN FORMAT - EXACTLY THIS:
1. Patient Name: [name or "Not found"]
2. Date of Birth: [DOB or "Not found"] 
3. Insurance: [insurance info or "Not found"]
4. Location: [facility/hospital or "Not found"]
5. Diagnosis: [diagnosis or "Not found"]
6. Primary Care Provider: [PCP name or "Not found"]
7. Discharge Info: [discharge details or "Not found"]
8. Wounds: [wound info or "Not found"]
9. Medications: [all medications/antibiotics or "Not found"]
10. Cardiac Medications: [cardiac drips/IV meds or "Not found"]
11. Labs and Vital Signs: [lab results, BP, temp, pulse, O2 or "Not found"]
12. Face to Face: [evaluations, visits, exams or "Not found"]
13. Medical History: [patient history or "Not found"]
14. Mental Health: [mental health status or "Not found"]
15. Additional Comments: [other relevant info or "Not found"]

RULES:
- Return ONLY the 15 numbered items above
- If information exists, write it after the colon
- If information doesn't exist, write "Not found"
- Be brief and direct
- No explanations or extra text
- Extract DOB in any format found (MM/DD/YYYY, DD-MM-YYYY, etc.)
- For Medications: Include ALL drugs, prescriptions, antibiotics mentioned
- For Labs and Vitals: Include both lab results AND vital signs (BP, temperature, pulse, oxygen levels)

Medical abbreviations:
Dx = Diagnosis, PCP = Primary Care Provider, DC = Discharge, Hx = History, BP = Blood Pressure, HR = Heart Rate, O2 = Oxygen, IV = Intravenous`;

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
      systemPrompt: this.systemPrompt
    };
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
      
      // Check if preferred model exists
      try {
        const response = await fetch(`${this.baseUrl}/api/show`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.defaultModel }),
        });
        
        if (response.ok) {
          return true;
        }
      } catch (error) {
        console.warn(`Error checking ${this.defaultModel}:`, error);
      }
      
      // Try fallback models
      const models = await this.getAvailableModels();
      if (models && models.length > 0) {
        for (const model of [this.defaultModel, ...this.fallbackModels]) {
          if (models.includes(model)) {
            this.defaultModel = model;
            return true;
          }
        }
        
        // Use first available model
        this.defaultModel = models[0];
        return true;
      }
      
      return false;
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
        prompt: documentText, // User prompt is just the document text
        system: this.systemPrompt, // All instructions in system prompt
        temperature: 0.1,
        stream: false,
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        
        // Try fallback model if available
        if (response.status === 404 && errorText.includes('model')) {
          const models = await this.getAvailableModels();
          if (models.length > 0) {
            const fallbackModel = models[0];
            this.updateProgress('processing', 0.4, 'Using fallback model', `Trying: ${fallbackModel}`);
            
            requestData.model = fallbackModel;
            const fallbackResponse = await fetch(`${this.baseUrl}/api/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestData),
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              this.updateProgress('processing', 0.7, 'Analysis complete', 'Fallback model successful');
              return fallbackData.response || JSON.stringify(fallbackData);
            }
          }
        }
        
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

  parseNumberedListFromLLM(text) {
    const result = {
      extractionMethod: 'numbered-list',
      extractionDate: new Date().toISOString(),
      patientName: '',
      patientDOB: '',
      insurance: '',
      location: '',
      dx: '',
      pcp: '',
      dc: '',
      wounds: '',
      medications: '',
      cardiacDrips: '',
      labsAndVitals: '',
      faceToFace: '',
      history: '',
      mentalHealthState: '',
      additionalComments: ''
    };
    
    const fieldMapping = {
      1: 'patientName',
      2: 'patientDOB',
      3: 'insurance',
      4: 'location',
      5: 'dx',
      6: 'pcp',
      7: 'dc',
      8: 'wounds',
      9: 'medications',
      10: 'cardiacDrips',
      11: 'labsAndVitals',
      12: 'faceToFace',
      13: 'history',
      14: 'mentalHealthState',
      15: 'additionalComments'
    };
    
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Focus on the number - match any format: "1." "1)" "1 " etc.
      // Then capture everything after the colon (if present) or after the field name
      const match = line.match(/^\s*(\d+)[\.\)\s]+(.+)$/);
      
      if (match) {
        const [, numberStr, restOfLine] = match;
        const number = parseInt(numberStr, 10);
        const fieldName = fieldMapping[number];
        
        if (fieldName && number >= 1 && number <= 15) {
          // Extract the actual content after the colon (if there is one)
          let content = restOfLine;
          
          // If there's a colon, take everything after it
          const colonIndex = restOfLine.indexOf(':');
          if (colonIndex !== -1) {
            content = restOfLine.substring(colonIndex + 1);
          }
          
          content = content.trim();
          
          // Only store if it's not "not found" and has actual content
          if (content && !content.toLowerCase().includes('not found') && content.length > 0) {
            result[fieldName] = content;
            console.log(`Field ${number} (${fieldName}): "${content}"`);
          }
        }
      }
    }
    
    return result;
  }

  async extractInformation(text, schema = null, model = this.defaultModel) {
    try {
      this.updateProgress('processing', 0.3, 'Starting AI analysis', 'Preparing document for extraction');
      
      // For very long documents, process in chunks
      const MAX_CHUNK_SIZE = 100000;
      
      if (text.length > MAX_CHUNK_SIZE) {
        const chunks = this.splitIntoChunks(text, MAX_CHUNK_SIZE, 1000);
        const chunkResults = [];
        
        for (let i = 0; i < chunks.length; i++) {
          this.updateProgress('processing', 0.35 + (0.4 * (i / chunks.length)), 
            `Analyzing section ${i+1}/${chunks.length}`, 
            `Processing document section ${i+1} of ${chunks.length}`);
          
          const chunkResult = await this.processSingleChunk(chunks[i], model);
          chunkResults.push(chunkResult);
        }
        
        this.updateProgress('processing', 0.8, 'Finalizing results', 'Combining information from all sections');
        return this.mergeChunkResults(chunkResults);
      } else {
        return this.processSingleChunk(text, model);
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

  splitIntoChunks(text, chunkSize, overlap) {
    const chunks = [];
    let startIndex = 0;
    
    while (startIndex < text.length) {
      let endIndex = Math.min(startIndex + chunkSize, text.length);
      
      if (endIndex < text.length) {
        const nextParagraph = text.indexOf('\n\n', endIndex - overlap);
        if (nextParagraph !== -1 && nextParagraph < endIndex + overlap) {
          endIndex = nextParagraph + 2;
        }
      }
      
      chunks.push(text.substring(startIndex, endIndex));
      startIndex = endIndex - overlap;
      
      if (startIndex <= 0 || endIndex >= text.length) {
        break;
      }
    }
    
    return chunks;
  }

  async processSingleChunk(text, model) {
    // Simple: just send the document text as user prompt
    const result = await this.generateCompletion(text, model);
    
    try {
      const extractedData = this.parseNumberedListFromLLM(result);
      this.updateProgress('processing', 0.75, 'Information extracted', 'Successfully extracted structured data');
      return extractedData;
    } catch (error) {
      this.updateProgress('error', 0.7, 'Parsing error', `Failed to extract: ${error.message}`);
      
      const errorObj = {
        extractionMethod: 'failed',
        error: 'Parsing error',
        errorDetails: error.message,
        rawOutput: result,
        timestamp: new Date().toISOString()
      };
      
      error.rawOutput = result;
      throw error;
    }
  }

  mergeChunkResults(results) {
    const mergedResult = {
      extractionMethod: 'numbered-list',
      extractionDate: new Date().toISOString()
    };
    
    const fields = [
      'patientName', 'patientDOB', 'insurance', 'location', 'dx', 'pcp', 'dc', 'wounds', 
      'medications', 'cardiacDrips', 'labsAndVitals', 'faceToFace', 
      'history', 'mentalHealthState', 'additionalComments'
    ];
    
    fields.forEach(field => {
      const fieldValues = results
        .map(result => result[field] || '')
        .filter(value => value.trim() !== '');
      
      if (fieldValues.length === 0) {
        mergedResult[field] = '';
        return;
      }
      
      // For single-value fields, use the longest (most complete) answer
      const singleValueFields = ['patientName', 'patientDOB', 'insurance', 'location', 'pcp', 'dc'];
      if (singleValueFields.includes(field)) {
        fieldValues.sort((a, b) => b.length - a.length);
        mergedResult[field] = fieldValues[0];
        return;
      }
      
      // For multi-value fields, combine unique values
      const uniqueValues = [...new Set(fieldValues)];
      mergedResult[field] = uniqueValues.join(' ');
    });
    
    this.updateProgress('processing', 0.9, 'Extraction complete', 'Successfully processed all information');
    return mergedResult;
  }
}

export default OllamaService;