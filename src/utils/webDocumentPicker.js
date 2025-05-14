/**
 * Web-specific implementation for document picking
 */

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
      
      resolve({
        uri: fileUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        // For web, we just use the same URL
        localPath: fileUrl,
      });
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

// Get saved documents - for web this will always be empty since we don't save files
export const getSavedDocuments = async () => {
  return [];
};

// Delete document
export const deleteDocument = async (filePath) => {
  // For web, we just revoke the URL if it's an object URL
  if (filePath.startsWith('blob:')) {
    URL.revokeObjectURL(filePath);
  }
  return true;
};