/**
 * Service for extracting structured form data from medical referral documents
 * Can use Ollama AI for extraction or fallback to regex-based extraction
 */
import OllamaService from './OllamaService';

class MedicalFormExtractor {
  static instance;
  
  constructor() {
    this.ollamaService = OllamaService.getInstance();
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
   * Extract form data from the provided text
   */
  async extractFormData(text) {
    try {
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
            
            console.log('AI extraction successful');
            return extractedData;
          }
        } catch (aiError) {
          console.warn('AI-based extraction failed, falling back to regex:', aiError);
          // Fall back to regex-based extraction
        }
      }
      
      // Fallback: Use regex-based extraction
      return this.extractFormDataWithRegex(text);
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
   * Extract form data using regex patterns (fallback method)
   */
  extractFormDataWithRegex(text) {
    const formData = {};
    
    // Helper function to extract fields using regex patterns
    const extractField = (fieldName, pattern) => {
      const match = text.match(pattern);
      return match ? match[1].trim() : null;
    };
    
    // Patient information
    const patientName = extractField('patientName', /(?:patient name|patient)[\s:]+([^\n]+)/i);
    const patientDOB = extractField('patientDOB', /(?:DOB|date of birth)[\s:]+([^\n]+)/i);
    const patientGender = extractField('patientGender', /(?:gender|sex)[\s:]+([^\n]+)/i);
    const patientPhone = extractField('patientPhone', /(?:phone|contact|tel)[\s:]+([^\n\)]+)/i);
    const patientID = extractField('patientID', /(?:ID|MRN|medical record|patient ID)[\s:]+([^\n]+)/i);
    
    // Insurance information
    const insurance = extractField('insurance', /(?:insurance|plan)[\s:]+([^\n]+)/i);
    const policyNumber = extractField('policyNumber', /(?:policy|policy #|policy number)[\s:]+([^\n]+)/i);
    
    // Referring physician
    const referringPhysician = extractField('referringPhysician', /(?:referring physician|doctor|dr\.)[\s:]+([^\n]+)/i);
    const referringPractice = extractField('referringPractice', /(?:practice|clinic|center)[\s:]+([^\n]+)/i);
    const physicianPhone = extractField('physicianPhone', /(?:phone|tel|contact)[\s:]+(\(\d{3}\)\s*\d{3}-\d{4}|\d{3}[-.\s]\d{3}[-.\s]\d{4})/i);
    const physicianNPI = extractField('physicianNPI', /(?:NPI|provider number)[\s:]+([^\n]+)/i);
    
    // Clinical information
    const diagnosis = extractField('diagnosis', /(?:diagnosis|assessment|impression)[\s:]+([^\n]+)/i);
    const symptoms = extractField('symptoms', /(?:symptoms|presenting with|complains of)[\s:]+([^\n]+)/i);
    const referralReason = extractField('referralReason', /(?:reason for referral|referral reason)[\s:]+([^\n.]+)/i);
    const urgency = extractField('urgency', /(?:urgency|priority)[\s:]+([^\n]+)/i);
    
    // Add all extracted data to the form data object
    if (patientName) formData.patientName = patientName;
    if (patientDOB) formData.patientDOB = patientDOB;
    if (patientGender) formData.patientGender = patientGender;
    if (patientPhone) formData.patientPhone = patientPhone;
    if (patientID) formData.patientID = patientID;
    
    if (insurance) formData.insurance = insurance;
    if (policyNumber) formData.policyNumber = policyNumber;
    
    if (referringPhysician) formData.referringPhysician = referringPhysician;
    if (referringPractice) formData.referringPractice = referringPractice;
    if (physicianPhone) formData.physicianPhone = physicianPhone;
    if (physicianNPI) formData.physicianNPI = physicianNPI;
    
    if (diagnosis) formData.diagnosis = diagnosis;
    if (symptoms) formData.symptoms = symptoms;
    if (referralReason) formData.referralReason = referralReason;
    if (urgency) formData.urgency = urgency;
    
    // Add current date and extraction method
    formData.extractedDate = new Date().toISOString().split('T')[0];
    formData.extractionMethod = 'regex';
    
    return formData;
  }
}

export default MedicalFormExtractor;