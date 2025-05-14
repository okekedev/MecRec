/**
 * Web-specific implementation for document picking and processing
 */

// In-memory document store for web version
const webDocumentStore = {
  documents: [],
  addDocument(document) {
    // Check if document already exists
    const existingIndex = this.documents.findIndex(doc => doc.name === document.name);
    if (existingIndex >= 0) {
      // Update existing document
      this.documents[existingIndex] = document;
    } else {
      // Add new document
      this.documents.push(document);
    }
  },
  getDocuments() {
    return [...this.documents];
  },
  getDocumentByName(name) {
    return this.documents.find(doc => doc.name === name);
  },
  removeDocument(uri) {
    const index = this.documents.findIndex(doc => doc.uri === uri);
    if (index >= 0) {
      const doc = this.documents[index];
      if (doc.uri.startsWith('blob:')) {
        URL.revokeObjectURL(doc.uri);
      }
      this.documents.splice(index, 1);
      return true;
    }
    return false;
  }
};

// PDF text extraction for the web
export const extractTextFromPdf = async (url) => {
  // For demo purposes, we'll use a mock result since PDF.js may not be available
  console.log('Web document extraction from URL:', url);
  
  // Demo medical document text
  const mockTexts = [
    `PATIENT REFERRAL FORM
    
Date: May 14, 2025

PATIENT INFORMATION
Name: John Smith
Date of Birth: 05/12/1980
Contact: (555) 123-4567
Medical Record #: 123456789
Insurance: BlueCross BlueShield
Policy Number: BCBS-123456789

REFERRING PHYSICIAN
Dr. Sarah Johnson
Cardiology Associates
Phone: (555) 987-6543
NPI: 1234567890

REASON FOR REFERRAL
Patient presents with recurring chest pain and shortness of breath. ECG shows possible ischemic changes. History of hypertension and elevated cholesterol. Family history of CAD. Please evaluate for possible coronary artery disease.

CLINICAL INFORMATION
Medications: Lisinopril 10mg daily, Simvastatin 20mg daily
Allergies: Penicillin (rash), Shellfish
Vitals: BP 142/88, HR 78, RR 16, Temp 98.6F
Recent Labs (05/10/2025): Total Cholesterol 225, LDL 155, HDL 42, Triglycerides 170

Please schedule this patient for evaluation within 2 weeks.

Thank you for your assistance in caring for this patient.

Signature: Dr. Sarah Johnson, MD
Date: 05/14/2025`,

    `MEDICAL CONSULTATION REQUEST
    
PATIENT DETAILS
Name: Emily Wilson
DOB: 11/24/1972
Gender: Female
Phone: (555) 234-5678
Medical ID: MRN-987654321

INSURANCE INFORMATION
Provider: Aetna
Policy #: ATN-987654321
Group #: GRP-12345

REFERRING DOCTOR
Name: Dr. Michael Chen
Practice: Valley Medical Group
Phone: (555) 876-5432
Fax: (555) 876-5433

CONSULTATION REQUESTED WITH
Specialty: Endocrinology
Reason: Evaluation of abnormal thyroid function tests and symptoms of fatigue, weight gain, and cold intolerance

CLINICAL INFORMATION
History: Patient has been experiencing increasing fatigue, 15lb weight gain over past 6 months, and sensitivity to cold. Family history of hypothyroidism.

Recent Labs (05/05/2025):
- TSH: 12.4 mIU/L (High)
- Free T4: 0.6 ng/dL (Low)
- TPO Antibodies: 780 IU/mL (High)

Current Medications:
- Escitalopram 10mg daily
- Vitamin D 2000 IU daily

URGENCY
☒ Routine (within 4 weeks)
☐ Urgent (within 1 week)
☐ Emergent (within 24-48 hours)

Additional Information: Patient is available for appointments on Tuesday and Thursday afternoons.

Signature: Dr. Michael Chen
Date: 05/14/2025`,

    `DIAGNOSTIC IMAGING REQUEST
    
Date: May 14, 2025

PATIENT INFORMATION
Name: Robert Thompson
DOB: 07/30/1965
Sex: Male
MRN: 567890123
Contact: (555) 345-6789
Insurance: Medicare
ID#: 123456789A

REFERRING PHYSICIAN
Dr. Lisa Wong
Internal Medicine Associates
Phone: (555) 765-4321
NPI: 0987654321

EXAMINATION REQUESTED
☒ MRI Brain with and without contrast
☐ CT Chest
☐ Ultrasound Abdomen
☐ X-ray
☐ Other: _______________

CLINICAL INDICATION
Patient with 6-week history of progressive right-sided weakness and difficulty with speech. Recent onset of headaches and one episode of confusion noted by family. Rule out CVA, space-occupying lesion.

RELEVANT HISTORY
HTN (10 years)
Type 2 Diabetes (8 years)
Prior right knee replacement (2022)

PATIENT PREPARATION
Fasting required: ☐ Yes ☒ No
Stop medication: ☐ Yes ☒ No
Prior imaging: ☒ Yes ☐ No
If yes, where: Memorial Hospital, CT Brain (04/15/2025)

SCHEDULING
Urgency: ☐ Routine ☒ Urgent (within 48 hours) ☐ STAT
Patient mobility: ☒ Ambulatory ☐ Wheelchair ☐ Stretcher

Additional Instructions:
Please call referring physician with results as soon as available. Patient has anxiety; may need mild sedation.

Signature: Dr. Lisa Wong, MD
Date: 05/14/2025`
  ];
  
  // Return a random sample text
  return {
    text: mockTexts[Math.floor(Math.random() * mockTexts.length)],
    pages: Math.floor(Math.random() * 3) + 1,
    isOcr: false
  };
};

// Simulated document picker for web
export const pickPdfDocument = async () => {
  return new Promise((resolve, reject) => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    
    // Handle the file selection
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      // Create a URL for the file
      const fileUrl = URL.createObjectURL(file);
      
      const document = {
        uri: fileUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        // For web, we just use the same URL
        localPath: fileUrl,
        // Add timestamp for sorting
        timestamp: Date.now()
      };
      
      // Store the document in our web document store
      webDocumentStore.addDocument(document);
      
      resolve(document);
    };
    
    // Handle cancel
    input.oncancel = () => {
      reject(new Error('User cancelled'));
    };
    
    // Trigger the file picker
    input.click();
  });
};

// Simulated document save
export const saveDocumentToAppStorage = async (uri, fileName) => {
  // In web, we don't really need to save the file, just return the URI
  return uri;
};

// Get saved documents from our in-memory store
export const getSavedDocuments = async () => {
  return webDocumentStore.getDocuments();
};

// Delete document from our store
export const deleteDocument = async (filePath) => {
  return webDocumentStore.removeDocument(filePath);
};

// Web-specific function to process a document
export const processWebDocument = async (uri, name) => {
  try {
    console.log('Processing web document:', name);
    
    // Extract text from the PDF
    const extractionResult = await extractTextFromPdf(uri);
    
    // Generate a unique ID and date
    const id = Date.now().toString();
    const date = new Date().toISOString().split('T')[0];
    
    // For web demo, create some fake form data
    const formData = {
      patientName: 'John Doe',
      patientDOB: '01/01/1970',
      insurance: 'Sample Health Insurance',
      policyNumber: '12345678',
      diagnosis: 'Hypertension, Type 2 Diabetes',
      extractionMethod: 'web-demo'
    };
    
    // Create embeddings (placeholder)
    const embeddingSize = 128;
    const embeddings = Array.from({ length: embeddingSize }, 
      () => Math.random() * 2 - 1);  // Random values between -1 and 1
    
    // Create processed document
    const processedDocument = {
      id,
      name,
      date,
      uri,
      extractedText: extractionResult.text,
      isOcr: extractionResult.isOcr,
      pages: extractionResult.pages,
      formData,
      embeddings,
      aiExtraction: false
    };
    
    return processedDocument;
  } catch (error) {
    console.error('Error processing web document:', error);
    throw error;
  }
};