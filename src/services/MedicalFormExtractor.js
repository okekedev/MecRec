/**
 * Enhanced MedicalFormExtractor with reference tracking capabilities
 */
import OllamaService from './OllamaService';
import DocumentReferenceService from './DocumentReferenceService';

class MedicalFormExtractor {
  static instance;
  
  constructor() {
    this.ollamaService = OllamaService.getInstance();
    this.referenceService = DocumentReferenceService.getInstance();
    this.useAI = true;
  }
  
  static getInstance() {
    if (!MedicalFormExtractor.instance) {
      MedicalFormExtractor.instance = new MedicalFormExtractor();
    }
    return MedicalFormExtractor.instance;
  }

  /**
   * Set whether to use AI-based extraction
   */
  setUseAI(useAI) {
    this.useAI = useAI;
  }
  
  /**
   * Extract form data from the provided text with reference tracking
   */
  async extractFormData(text, documentId = null) {
    try {
      // Process document for references
      if (documentId) {
        this.referenceService.processDocument(documentId, text);
      }
      
      // If AI extraction is enabled, try using Ollama first
      if (this.useAI) {
        try {
          // Check if Ollama is available
          const connectionTest = await this.ollamaService.testConnection();
          
          if (connectionTest) {
            // Define the schema for information extraction
            const schema = {
              patientName: "The full name of the patient",
              patientDOB: "Patient's date of birth",
              patientGender: "Patient's gender",
              patientID: "Patient's ID or medical record number",
              patientPhone: "Patient's phone number",
              insurance: "Patient's insurance provider",
              policyNumber: "Patient's insurance policy number",
              referringPhysician: "Name of the referring physician",
              referringPractice: "Name of the referring practice/clinic",
              physicianPhone: "Phone number of the referring physician",
              physicianNPI: "NPI number of the referring physician",
              diagnosis: "Primary diagnosis or assessment",
              symptoms: "Patient's symptoms",
              referralReason: "Reason for the referral",
              urgency: "Urgency level of the referral (routine, urgent, etc.)"
            };
            
            // Use Ollama to extract information
            const extractedData = await this.ollamaService.extractInformation(text, schema);
            
            // Add extraction date and method
            extractedData.extractedDate = new Date().toISOString().split('T')[0];
            extractedData.extractionMethod = 'ai';
            
            // Find and add references for each field
            const extractedWithReferences = await this.addReferencesToExtractedData(
              extractedData,
              text,
              documentId
            );
            
            console.log('AI extraction successful with references');
            return extractedWithReferences;
          }
        } catch (aiError) {
          console.warn('AI-based extraction failed, falling back to regex:', aiError);
          // Fall back to regex-based extraction
        }
      }
      
      // Fallback: Use regex-based extraction with references
      return this.extractFormDataWithRegex(text, documentId);
    } catch (error) {
      console.error('Form extraction error:', error);
      // If all fails, return just the extraction date
      return {
        extractedDate: new Date().toISOString().split('T')[0],
        extractionMethod: 'fallback',
      };
    }
  }
  
  /**
   * Add reference information to extracted data fields
   */
  async addReferencesToExtractedData(extractedData, text, documentId) {
    // Create a copy to avoid modifying the original
    const dataWithReferences = { ...extractedData };
    
    // Add a references object
    dataWithReferences._references = {};
    
    // For each field, try to find the source in the text
    for (const [field, value] of Object.entries(extractedData)) {
      // Skip if the field is null, undefined, or a meta field
      if (value === null || value === undefined || field.startsWith('_') || field === 'extractedDate' || field === 'extractionMethod') {
        continue;
      }
      
      try {
        // Find the source of this information in the text
        const reference = await this.findReferenceForField(field, value, text);
        
        if (reference) {
          dataWithReferences._references[field] = reference;
        }
      } catch (err) {
        console.warn(`Error finding reference for field ${field}:`, err);
      }
    }
    
    return dataWithReferences;
  }
  
  /**
   * Find the source reference for a specific field and value
   */
  async findReferenceForField(field, value, text) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return null;
    }
    
    // Try to find an exact match first
    const exactMatch = text.indexOf(value);
    if (exactMatch >= 0) {
      // Get surrounding context
      const startPos = Math.max(0, exactMatch - 50);
      const endPos = Math.min(text.length, exactMatch + value.length + 50);
      const context = text.substring(startPos, endPos);
      
      return {
        text: context,
        value: value,
        position: {
          start: exactMatch,
          end: exactMatch + value.length
        },
        exactMatch: true,
        field: field,
        type: this.getFieldSectionType(field)
      };
    }
    
    // Try to find the value in a section that's likely to contain this field
    const relevantSections = await this.referenceService.findRelevantSections(
      text,
      `${this.getFieldSearchTerms(field)} ${value}`,
      1
    );
    
    if (relevantSections.length > 0) {
      return {
        text: relevantSections[0].text,
        value: value,
        location: relevantSections[0].location,
        field: field,
        exactMatch: false,
        score: relevantSections[0].score,
        type: this.getFieldSectionType(field)
      };
    }
    
    // No reference found
    return null;
  }
  
  /**
   * Get search terms for a field to help find its source
   */
  getFieldSearchTerms(field) {
    const fieldTerms = {
      patientName: "patient name",
      patientDOB: "date of birth DOB",
      patientGender: "gender sex",
      patientID: "ID MRN medical record number",
      patientPhone: "phone contact",
      insurance: "insurance provider plan",
      policyNumber: "policy number ID",
      referringPhysician: "referring physician doctor provider",
      referringPractice: "practice clinic center",
      physicianPhone: "phone contact",
      physicianNPI: "NPI provider number",
      diagnosis: "diagnosis assessment impression condition",
      symptoms: "symptoms presents with presenting complaint", 
      referralReason: "reason for referral",
      urgency: "urgency priority urgent routine"
    };
    
    return fieldTerms[field] || field.replace(/([A-Z])/g, ' $1').toLowerCase();
  }
  
  /**
   * Get the section type for a field
   */
  getFieldSectionType(field) {
    if (field.startsWith('patient')) {
      return 'Patient Information';
    }
    
    if (field.includes('insurance') || field.includes('policy')) {
      return 'Insurance Information';
    }
    
    if (field.includes('physician') || field.includes('practice') || field.includes('NPI')) {
      return 'Referring Physician';
    }
    
    if (field.includes('diagnosis') || field.includes('symptoms')) {
      return 'Diagnosis/Assessment';
    }
    
    if (field.includes('referral')) {
      return 'Referral Information';
    }
    
    return 'General';
  }
  
  /**
   * Extract form data using regex patterns (fallback method)
   */
  async extractFormDataWithRegex(text, documentId) {
    const formData = {};
    const references = {};
    
    // Helper function to extract fields using regex patterns and track references
    const extractField = (fieldName, pattern) => {
      const match = text.match(pattern);
      
      if (match) {
        const value = match[1].trim();
        formData[fieldName] = value;
        
        // Add reference
        references[fieldName] = {
          text: match[0],
          value: value,
          position: {
            start: text.indexOf(match[0]),
            end: text.indexOf(match[0]) + match[0].length
          },
          exactMatch: true,
          field: fieldName,
          type: this.getFieldSectionType(fieldName)
        };
        
        return value;
      }
      
      return null;
    };
    
    // Patient information
    extractField('patientName', /(?:patient name|patient)[\s:]+([^\n]+)/i);
    extractField('patientDOB', /(?:DOB|date of birth)[\s:]+([^\n]+)/i);
    extractField('patientGender', /(?:gender|sex)[\s:]+([^\n]+)/i);
    extractField('patientPhone', /(?:phone|contact|tel)[\s:]+([^\n\)]+)/i);
    extractField('patientID', /(?:ID|MRN|medical record|patient ID)[\s:]+([^\n]+)/i);
    
    // Insurance information
    extractField('insurance', /(?:insurance|plan)[\s:]+([^\n]+)/i);
    extractField('policyNumber', /(?:policy|policy #|policy number)[\s:]+([^\n]+)/i);
    
    // Referring physician
    extractField('referringPhysician', /(?:referring physician|doctor|dr\.)[\s:]+([^\n]+)/i);
    extractField('referringPractice', /(?:practice|clinic|center)[\s:]+([^\n]+)/i);
    extractField('physicianPhone', /(?:phone|tel|contact)[\s:]+(\(\d{3}\)\s*\d{3}-\d{4}|\d{3}[-.\s]\d{3}[-.\s]\d{4})/i);
    extractField('physicianNPI', /(?:NPI|provider number)[\s:]+([^\n]+)/i);
    
    // Clinical information
    extractField('diagnosis', /(?:diagnosis|assessment|impression)[\s:]+([^\n]+)/i);
    extractField('symptoms', /(?:symptoms|presenting with|complains of)[\s:]+([^\n]+)/i);
    extractField('referralReason', /(?:reason for referral|referral reason)[\s:]+([^\n.]+)/i);
    extractField('urgency', /(?:urgency|priority)[\s:]+([^\n]+)/i);
    
    // Add current date and extraction method
    formData.extractedDate = new Date().toISOString().split('T')[0];
    formData.extractionMethod = 'regex';
    
    // Add references
    formData._references = references;
    
    return formData;
  }
  
  /**
   * Get references for an extracted field
   */
  getFieldReference(extractedData, fieldName) {
    if (extractedData && extractedData._references && extractedData._references[fieldName]) {
      return extractedData._references[fieldName];
    }
    return null;
  }
}

export default MedicalFormExtractor;