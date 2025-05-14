/**
 * Service for extracting text from PDF documents with reference tracking
 * This implementation uses PDF.js for direct text extraction and Tesseract.js for OCR
 */
import * as PDFJS from 'pdfjs-dist';
import * as Tesseract from 'tesseract.js';
import { Platform } from 'react-native';
import FSService from '../utils/fsService';
import DocumentReferenceService from './DocumentReferenceService';
import { isWeb } from '../utils/platform';

// Set up PDF.js worker - necessary for PDF.js to function
if (isWeb) {
  // For web
  const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry');
  PDFJS.GlobalWorkerOptions.workerSrc = pdfjsWorker;
} else {
  // For React Native
  PDFJS.GlobalWorkerOptions.workerSrc = 'pdf.worker.js'; // This should be bundled with your app
}

class PDFTextExtractionService {
  static instance;
  
  constructor() {
    this.referenceService = DocumentReferenceService.getInstance();
    this.progressCallback = null;
    this.totalPages = 0;
    this.processedPages = 0;
    this.tesseractWorker = null;
  }
  
  static getInstance() {
    if (!PDFTextExtractionService.instance) {
      PDFTextExtractionService.instance = new PDFTextExtractionService();
    }
    return PDFTextExtractionService.instance;
  }
  
  /**
   * Set a callback for progress updates
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }
  
  /**
   * Update progress
   */
  updateProgress(status, progress) {
    if (this.progressCallback) {
      const overallProgress = this.totalPages > 0 
        ? ((this.processedPages + progress) / this.totalPages)
        : progress;
      
      this.progressCallback({
        status,
        progress: overallProgress,
        page: this.processedPages + 1,
        totalPages: this.totalPages
      });
    }
  }
  
  /**
   * Extract text from a PDF document using direct extraction first,
   * then falling back to OCR if direct extraction yields little text
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} Extraction result
   */
  async extractText(filePath) {
    this.processedPages = 0;
    this.updateProgress('Starting extraction', 0);
    
    try {
      // Check if file exists
      const exists = await FSService.exists(filePath);
      if (!exists) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      
      // First try direct extraction
      this.updateProgress('Attempting direct extraction', 0);
      const directResult = await this.extractTextDirect(filePath);
      
      // If direct extraction yields enough text, return it
      // We consider "enough text" to be more than 100 characters per page on average
      const textPerPage = directResult.text.length / directResult.pages;
      if (textPerPage > 100) {
        this.updateProgress('Direct extraction completed', 1);
        console.log('Direct extraction successful');
        return directResult;
      }
      
      // Otherwise, try OCR
      this.updateProgress('Direct extraction insufficient, preparing OCR', 0);
      console.log('Direct extraction yielded insufficient text, trying OCR');
      const ocrResult = await this.extractTextOCR(filePath);
      return ocrResult;
    } catch (error) {
      // If direct extraction fails, try OCR
      this.updateProgress('Direct extraction failed, preparing OCR', 0);
      console.warn('Direct extraction failed, trying OCR:', error);
      
      try {
        const ocrResult = await this.extractTextOCR(filePath);
        return ocrResult;
      } catch (ocrError) {
        console.error('OCR extraction also failed:', ocrError);
        // If both methods fail, return a minimal result with error info
        return {
          text: '',
          isOcr: false,
          pages: 0,
          error: ocrError.message
        };
      }
    }
  }
  
  /**
   * Extract text directly from PDF using PDF.js
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} Extraction result
   */
  async extractTextDirect(filePath) {
    try {
      // Read the file
      this.updateProgress('Reading PDF file', 0.1);
      
      // Handle file reading differently based on platform
      let pdfData;
      if (isWeb) {
        // For web, we can use the URL directly in most cases
        if (filePath.startsWith('blob:') || filePath.startsWith('http')) {
          pdfData = { url: filePath };
        } else {
          // If it's a file path or base64 data, we need to handle it differently
          const response = await fetch(filePath);
          const blob = await response.blob();
          pdfData = { data: new Uint8Array(await blob.arrayBuffer()) };
        }
      } else {
        // For native platforms, read the file as base64 or binary
        const fileData = await FSService.readFile(filePath);
        if (typeof fileData === 'string') {
          // If it's base64 encoded
          pdfData = { data: this.base64ToUint8Array(fileData) };
        } else {
          // If it's already a Uint8Array or ArrayBuffer
          pdfData = { data: fileData };
        }
      }
      
      // Load the PDF document
      this.updateProgress('Loading PDF document', 0.2);
      const loadingTask = PDFJS.getDocument(pdfData);
      const pdfDocument = await loadingTask.promise;
      
      // Store total pages for progress calculation
      this.totalPages = pdfDocument.numPages;
      console.log(`PDF has ${this.totalPages} pages`);
      
      // Extract text from each page
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
        this.processedPages = pageNum - 1;
        this.updateProgress(`Extracting text from page ${pageNum}/${this.totalPages}`, 0.3);
        
        // Get the page
        const page = await pdfDocument.getPage(pageNum);
        
        // Extract text content
        const textContent = await page.getTextContent();
        
        // Process text content
        let pageText = '';
        let lastY = -1;
        
        // Combine text items into lines based on y-position
        for (const item of textContent.items) {
          if (lastY !== item.transform[5] && pageText !== '') {
            pageText += '\n';
          }
          pageText += item.str;
          lastY = item.transform[5];
        }
        
        // Add page text to full text
        fullText += pageText + '\n\n';
        
        // Clean up
        page.cleanup();
      }
      
      // Process the extracted text
      this.updateProgress('Processing extracted text', 0.9);
      
      // Identify sections in the text
      const sections = this.identifySections(fullText);
      
      // Add reference information
      const references = this.createReferencePoints(fullText);
      
      this.updateProgress('Text extraction complete', 1.0);
      
      return {
        text: fullText,
        isOcr: false,
        pages: this.totalPages,
        sections: sections,
        references: references
      };
    } catch (error) {
      console.error('PDF direct extraction error:', error);
      throw error;
    }
  }
  
  /**
   * Extract text using OCR for image-based PDFs using Tesseract.js
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} Extraction result
   */
  async extractTextOCR(filePath) {
    try {
      this.updateProgress('Preparing for OCR processing', 0.1);
      
      // Convert PDF to images
      const pageImages = await this.convertPdfToImages(filePath);
      
      this.totalPages = pageImages.length;
      console.log(`PDF converted to ${this.totalPages} images for OCR`);
      
      // Initialize Tesseract worker if not already done
      if (!this.tesseractWorker) {
        this.updateProgress('Initializing OCR engine', 0.2);
        this.tesseractWorker = await Tesseract.createWorker({
          logger: m => {
            console.log(`Tesseract: ${m.status} (${Math.floor(m.progress * 100)}%)`);
            this.updateProgress(`OCR: ${m.status}`, m.progress);
          }
        });
        await this.tesseractWorker.loadLanguage('eng');
        await this.tesseractWorker.initialize('eng');
      }
      
      // Process each page with OCR
      let fullText = '';
      let overallConfidence = 0;
      
      for (let i = 0; i < pageImages.length; i++) {
        this.processedPages = i;
        this.updateProgress(`OCR processing page ${i + 1}/${pageImages.length}`, 0.3);
        
        // Recognize text in the image
        const result = await this.tesseractWorker.recognize(pageImages[i]);
        
        // Add page text to full text
        fullText += result.data.text + '\n\n';
        
        // Track confidence
        overallConfidence += result.data.confidence;
        
        // Clean up image if needed
        if (Platform.OS !== 'web' && pageImages[i].startsWith('file://')) {
          try {
            await FSService.unlink(pageImages[i]);
          } catch (e) {
            console.warn('Failed to clean up temporary image:', e);
          }
        }
      }
      
      // Calculate average confidence
      overallConfidence = overallConfidence / pageImages.length;
      
      // Process the extracted text
      this.updateProgress('Processing OCR results', 0.9);
      
      // Identify sections in the text
      const sections = this.identifySections(fullText);
      
      // Add reference information
      const references = this.createReferencePoints(fullText);
      
      this.updateProgress('OCR processing complete', 1.0);
      
      return {
        text: fullText,
        isOcr: true,
        pages: pageImages.length,
        confidence: overallConfidence,
        sections: sections,
        references: references
      };
    } catch (error) {
      console.error('OCR extraction error:', error);
      throw error;
    } finally {
      // Clean up Tesseract worker if needed
      // Note: We might want to keep it for reuse instead of terminating
      /*
      if (this.tesseractWorker) {
        await this.tesseractWorker.terminate();
        this.tesseractWorker = null;
      }
      */
    }
  }
  
  /**
   * Convert PDF to images for OCR processing
   * @param {string} filePath - Path to the PDF
   * @returns {Promise<Array<string>>} Array of image URIs
   */
  async convertPdfToImages(filePath) {
    this.updateProgress('Converting PDF to images', 0.1);
    
    try {
      // For this implementation, we'll use PDF.js to render pages to canvas
      // and then convert canvas to images
      
      // Read the file
      let pdfData;
      if (isWeb) {
        if (filePath.startsWith('blob:') || filePath.startsWith('http')) {
          pdfData = { url: filePath };
        } else {
          const response = await fetch(filePath);
          const blob = await response.blob();
          pdfData = { data: new Uint8Array(await blob.arrayBuffer()) };
        }
      } else {
        const fileData = await FSService.readFile(filePath);
        if (typeof fileData === 'string') {
          pdfData = { data: this.base64ToUint8Array(fileData) };
        } else {
          pdfData = { data: fileData };
        }
      }
      
      // Load the PDF
      const loadingTask = PDFJS.getDocument(pdfData);
      const pdfDocument = await loadingTask.promise;
      
      // Get total pages
      const numPages = pdfDocument.numPages;
      const imageURIs = [];
      
      // For each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        this.updateProgress(`Converting page ${pageNum}/${numPages} to image`, 0.1 + (0.4 * pageNum / numPages));
        
        // Get the page
        const page = await pdfDocument.getPage(pageNum);
        
        // Determine scale to render at reasonable resolution
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Create canvas
        let canvas;
        if (isWeb) {
          canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
        } else {
          // For React Native, we need a different approach
          // Using an off-screen canvas library or native module would be required
          // For simplicity, we'll generate a mock image path here
          imageURIs.push(`page-${pageNum}.png`);
          continue;
        }
        
        // Render the page to canvas
        const context = canvas.getContext('2d');
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Convert canvas to image URI
        let imageURI;
        if (isWeb) {
          imageURI = canvas.toDataURL('image/png');
        } else {
          // For native, we would have rendered to a file directly
          imageURI = `page-${pageNum}.png`;
        }
        
        imageURIs.push(imageURI);
        
        // Clean up
        page.cleanup();
      }
      
      return imageURIs;
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      throw new Error(`Failed to convert PDF to images: ${error.message}`);
    }
  }
  
  /**
   * Create reference points for extracted text
   * This helps with tracking where information came from
   */
  createReferencePoints(text) {
    // Split the text into sections
    const sections = this.identifySections(text);
    
    // Create reference points for each section
    const referencePoints = sections.map((section, index) => ({
      id: `section-${index + 1}`,
      text: section.text,
      type: section.type,
      position: {
        start: text.indexOf(section.text),
        end: text.indexOf(section.text) + section.text.length
      }
    }));
    
    return referencePoints;
  }
  
  /**
   * Identify different sections in the extracted text
   */
  identifySections(text) {
    // Simple section identification by looking for headers
    const sections = [];
    
    // Split text into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    let currentType = 'Header';
    let currentContent = '';
    
    // Process each paragraph
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      
      // Skip empty paragraphs
      if (!trimmed) continue;
      
      // Check if this looks like a section header
      const isHeader = trimmed === trimmed.toUpperCase() && trimmed.length < 50;
      
      if (isHeader) {
        // Save previous section if there is content
        if (currentContent) {
          sections.push({
            type: currentType,
            text: currentContent.trim()
          });
        }
        
        // Start a new section
        currentType = this.determineSectionType(trimmed);
        currentContent = trimmed;
      } else {
        // Add to current section
        currentContent += '\n\n' + trimmed;
      }
    }
    
    // Add the last section
    if (currentContent) {
      sections.push({
        type: currentType,
        text: currentContent.trim()
      });
    }
    
    return sections;
  }
  
  /**
   * Determine the type of a section based on its content
   */
  determineSectionType(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('patient')) {
      return 'Patient Information';
    }
    
    if (lowerText.includes('referring') || lowerText.includes('physician')) {
      return 'Referring Physician';
    }
    
    if (lowerText.includes('reason') && lowerText.includes('referral')) {
      return 'Reason for Referral';
    }
    
    if (lowerText.includes('history')) {
      return 'Medical History';
    }
    
    if (lowerText.includes('medication')) {
      return 'Medications';
    }
    
    if (lowerText.includes('labs') || lowerText.includes('studies')) {
      return 'Labs/Studies';
    }
    
    if (lowerText.includes('clinical')) {
      return 'Clinical Information';
    }
    
    if (lowerText.includes('diagnosis')) {
      return 'Diagnosis';
    }
    
    // Default section type
    return 'General Information';
  }
  
  /**
   * Convert Base64 to Uint8Array
   * @param {string} base64 - Base64 string
   * @returns {Uint8Array} Result array
   */
  base64ToUint8Array(base64) {
    const raw = isWeb ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      uint8Array[i] = raw.charCodeAt(i);
    }
    return uint8Array;
  }
  
  /**
   * Fallback to generate sample text when all extraction methods fail
   * Or when in development/testing mode
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