/**
 * Service for extracting structured form data from medical referral documents
 * This is a placeholder implementation that would normally use NLP/ML techniques
 */
class MedicalFormExtractor {
  private static instance: MedicalFormExtractor;
  
  private constructor() {}
  
  public static getInstance(): MedicalFormExtractor {
    if (!MedicalFormExtractor.instance) {
      MedicalFormExtractor.instance = new MedicalFormExtractor();
    }
    return MedicalFormExtractor.instance;
  }
  
  /**
   * Extract form data from the provided text
   */
  public extractFormData(text: string): Record<string, any> {
    const formData: Record<string, any> = {};
    
    // Helper function to extract fields using regex patterns
    const extractField = (fieldName: string, pattern: RegExp): string | null => {
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
    
    // Add current date
    formData.extractedDate = new Date().toISOString().split('T')[0];
    
    return formData;
  }
}

export default MedicalFormExtractor;