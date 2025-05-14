/**
 * Web-specific document picker and processing 
 * WITHOUT sample data to avoid confusion
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

// PDF text extraction for the web - no sample data
export const extractTextFromPdf = async (url) => {
  console.log('Web document extraction from URL:', url);
  
  try {
    // Actual extraction would happen here
    // For now, return empty text to avoid confusion with sample data
    return {
      text: '',  // Empty text instead of sample data
      pages: 1,  
      isOcr: false
    };
  } catch (error) {
    console.error('Error in web document extraction:', error);
    return {
      text: '',
      pages: 0,
      isOcr: false,
      error: error.message
    };
  }
};

// Simulated document picker for web
export const pickPdfDocument = async () => {
  return new Promise((resolve, reject) => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    
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
    
    // For web demo, create empty form data
    const formData = {
      patientName: '',
      patientDOB: '',
      insurance: '',
      policyNumber: '',
      diagnosis: '',
      extractionMethod: 'web-extraction'
    };
    
    // Create processed document with empty text
    const processedDocument = {
      id,
      name,
      date,
      uri,
      extractedText: extractionResult.text || '',
      isOcr: extractionResult.isOcr,
      pages: extractionResult.pages,
      formData,
      embeddings: [],
      aiExtraction: false
    };
    
    return processedDocument;
  } catch (error) {
    console.error('Error processing web document:', error);
    throw error;
  }
};