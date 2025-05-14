import FSService from '../utils/fsService';

/**
 * Service for extracting text from PDF documents
 * This is a placeholder implementation that simulates PDF text extraction
 * In a real app, you would integrate with libraries like react-native-pdf-lib,
 * and possibly a cloud OCR service for image-based PDFs
 */
class PDFTextExtractionService {
  static instance;
  
  constructor() {}
  
  static getInstance() {
    if (!PDFTextExtractionService.instance) {
      PDFTextExtractionService.instance = new PDFTextExtractionService();
    }
    return PDFTextExtractionService.instance;
  }
  
  /**
   * Extract text from a PDF document using direct extraction first,
   * then falling back to OCR if direct extraction yields little text
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} Extraction result
   */
  async extractText(filePath) {
    // Check if file exists
    const exists = await FSService.exists(filePath);
    if (!exists) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    
    // First try direct extraction
    try {
      const directResult = await this.extractTextDirect(filePath);
      
      // If direct extraction yields enough text, return it
      if (directResult.text.length > 100) {
        return directResult;
      }
      
      // Otherwise, try OCR
      const ocrResult = await this.extractTextOCR(filePath);
      return ocrResult;
    } catch (error) {
      // If direct extraction fails, try OCR
      console.warn('Direct extraction failed, trying OCR:', error);
      const ocrResult = await this.extractTextOCR(filePath);
      return ocrResult;
    }
  }
  
  /**
   * Extract text directly from PDF
   * In a real app, this would use a library like react-native-pdf-lib
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} Extraction result
   */
  async extractTextDirect(filePath) {
    // This is a placeholder. In a real app, you would use a PDF parsing library
    // For demonstration, we'll simulate success or failure
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate successful text extraction 80% of the time
    const success = Math.random() < 0.8;
    
    if (success) {
      // Simulate extracted text
      return {
        text: this.generateSampleMedicalText(),
        isOcr: false,
        pages: 3,
      };
    } else {
      // Simulate a case where the PDF is image-based with little extractable text
      return {
        text: '',
        isOcr: false,
        pages: 3,
      };
    }
  }
  
  /**
   * Extract text using OCR for image-based PDFs
   * In a real app, this would call a cloud OCR service
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} Extraction result
   */
  async extractTextOCR(filePath) {
    // This is a placeholder. In a real app, you would integrate with an OCR service
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate OCR
    return {
      text: this.generateSampleMedicalText(),
      isOcr: true,
      pages: 3,
      confidence: 0.85 + (Math.random() * 0.1),
    };
  }
  
  /**
   * Generate sample medical text for demonstration
   * @returns {string} Sample medical text
   */
  generateSampleMedicalText() {
    const texts = [
      `PATIENT REFERRAL
Date: May 5, 2025
Patient Name: John Smith
DOB: 01/15/1975
Insurance: Blue Cross Blue Shield
Policy #: XYZ123456789

REFERRING PHYSICIAN
Dr. Sarah Johnson
Cardiology Associates
123 Medical Plaza, Suite 300
Phone: (555) 123-4567
Fax: (555) 123-4568
NPI: 1234567890

REASON FOR REFERRAL
Patient presents with recurring chest pain and shortness of breath upon exertion. Recent ECG showed possible ischemic changes. Family history of CAD. Please evaluate for possible coronary artery disease.

RELEVANT HISTORY
Hypertension: Diagnosed 2020, currently on Lisinopril 10mg daily
Hyperlipidemia: Total cholesterol 225, LDL 155, HDL 40
Tobacco use: Former smoker, quit 5 years ago
Family history: Father had MI at age 58

CURRENT MEDICATIONS
Lisinopril 10mg daily
Atorvastatin 20mg daily
Aspirin 81mg daily

RECENT LABS/STUDIES
ECG (05/01/2025): T-wave inversion in V3-V4
Chest X-ray (05/01/2025): No acute findings
Labs (05/01/2025): Within normal limits except elevated LDL

REQUESTED SERVICES
Cardiology consultation
Consider stress test and/or cardiac catheterization if indicated

Thank you for seeing this patient. Please call if you need any additional information.

Sincerely,
Dr. Sarah Johnson, MD`,

      `MEDICAL REFERRAL FORM
      
PATIENT INFORMATION
Name: Emily Johnson
Date of Birth: 03/22/1982
Medical Record #: 78912345
Contact: (555) 987-6543
Insurance: Aetna Health
Policy #: AET987654321

REFERRING PROVIDER
Name: Dr. Michael Chen
Practice: Valley Medical Group
Phone: (555) 111-2222
Fax: (555) 111-2223
NPI: 9876543210

REFERRED TO
Dr. Rebecca Martinez
Neurology Specialists
456 Health Parkway, Suite 200
Appointment requested within: 2 weeks

CLINICAL INFORMATION
Chief Complaint: Progressive headaches for 3 months with recent visual changes

History of Present Illness:
Patient reports throbbing headaches, primarily in the right temporal region, occurring 3-4 times weekly. Pain rated 7/10 at worst. Associated with photophobia and occasional nausea. In the past two weeks, patient has noted brief episodes of visual field defects described as "flashing lights" followed by a "curtain" over the right visual field lasting 15-20 minutes.

PMH: Migraine (without aura), Hypothyroidism, Anxiety
PSH: Appendectomy (2010)
Allergies: Penicillin (hives)
Medications: Levothyroxine 50mcg daily, Sertraline 50mg daily

Recent Studies:
CBC, CMP (05/01/2025): WNL
TSH (05/01/2025): 2.4 (WNL)

REASON FOR REFERRAL
Evaluation for worsening migraine with new visual symptoms. Please assess for possible underlying vascular pathology.

Please fax consult notes to (555) 111-2223. Thank you for your assistance in caring for this patient.`,

      `DIAGNOSTIC IMAGING REFERRAL
      
PATIENT DEMOGRAPHICS
Name: Robert Thompson
DOB: 11/30/1968
Gender: Male
MRN: 54321-ABC
Phone: (555) 333-4444
Insurance: Medicare
ID: 1234567A

REFERRING PHYSICIAN
Dr. Lisa Wong
Internal Medicine Associates
789 Healthcare Drive
Phone: (555) 777-8888
Fax: (555) 777-8889

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
Date: 05/10/2025`
    ];
    
    // Return a random sample text
    return texts[Math.floor(Math.random() * texts.length)];
  }
}

export default PDFTextExtractionService;