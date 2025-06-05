/**
 * Azure OpenAI API Proxy - CommonJS version
 */
const express = require('express');
const { AzureOpenAI } = require('openai');

const router = express.Router();

// Initialize Azure OpenAI with server-side environment variables
const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://medrecapp.openai.azure.com/',
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1-mini',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview',
});

// Validate configuration on startup
if (!process.env.AZURE_OPENAI_API_KEY) {
  console.error('❌ AZURE_OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

console.log('✅ Azure OpenAI configured:');
console.log(`📍 Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
console.log(`🚀 Deployment: ${process.env.AZURE_OPENAI_DEPLOYMENT}`);
console.log(`🔑 API Key: [HIDDEN - ${process.env.AZURE_OPENAI_API_KEY?.length} characters]`);

/**
 * System prompt
 */
function getSystemPrompt() {
  return `You are a medical AI assistant specialized in extracting information from clinical documents.

TASK: Read the medical document carefully and extract specific information into 15 numbered fields.

OUTPUT FORMAT RULES:
- Each line starts with: NUMBER|EXTRACTED_INFORMATION
- Extract real information from the document
- Do not leave fields empty unless truly no information exists
- Look carefully for patient names, dates, diagnoses, medications, etc.
- Use the pipe symbol (|) to separate the number from the content
- Ensure the content is relevant to the field number
- Be thorough and accurate

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
12 = History and physical/H&P (examination notes, assessments, is the face to face signed?)
13 = Medical history Discharge Summary (past conditions, previous medical issues)
14 = Mental status (cognitive state, mental health notes)
15 = Additional notes (other important clinical information)

IMPORTANT: Extract actual information from the document. Do not return empty fields unless the information truly doesn't exist in the document.`;
}

/**
 * Document extraction endpoint
 */
router.post('/extract', async (req, res) => {
  try {
    const { documentText } = req.body;
    
    // Validate input
    if (!documentText || typeof documentText !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Document text is required'
      });
    }
    
    if (documentText.trim().length < 50) {
      console.warn('Document text is very short:', documentText.length, 'characters');
    }
    
    console.log(`🤖 Processing document extraction (${documentText.length} characters)`);
    
    // Call Azure OpenAI
    const response = await client.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: getSystemPrompt() 
        },
        { 
          role: 'user', 
          content: `Read this medical document carefully and extract the requested information:

MEDICAL DOCUMENT TEXT:
${documentText}

INSTRUCTIONS:
1. Read the entire document above
2. Look for patient information, medical details, diagnoses, medications, etc.
3. Extract information into the 15 numbered fields using pipe format
4. Put actual information after each pipe symbol
5. Only leave a field empty (NUMBER|) if that information truly doesn't exist

Extract the information now using the NUMBER|CONTENT format:`
        }
      ],
      model: process.env.AZURE_OPENAI_MODEL_NAME || 'gpt-4.1-mini',
      max_completion_tokens: 3000,
      temperature: 0.1,
      top_p: 0.3,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const extractedData = response.choices[0]?.message?.content || '';
    
    console.log(`✅ Azure OpenAI response received (${extractedData.length} characters)`);
    
    res.json({
      success: true,
      extractedData: extractedData,
      metadata: {
        model: process.env.AZURE_OPENAI_MODEL_NAME,
        timestamp: new Date().toISOString(),
        inputLength: documentText.length,
        outputLength: extractedData.length
      }
    });
    
  } catch (error) {
    console.error('❌ Azure OpenAI Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'AI extraction failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check for the API
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Azure OpenAI Proxy',
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    hasApiKey: !!process.env.AZURE_OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;