import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { isWeb } from './platform';

/**
 * Opens document picker to select a PDF file
 * @returns {Promise<Object|null>} Document info object or null
 */
export const pickPdfDocument = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true
    });
    
    if (result.canceled) {
      return null;
    }
    
    const document = result.assets[0];
    
    return {
      uri: document.uri,
      name: document.name || 'document.pdf',
      size: document.size || 0,
      type: document.mimeType || 'application/pdf',
      localPath: document.uri,
    };
  } catch (error) {
    console.error('Error picking document:', error);
    return null;
  }
};

/**
 * Saves a document to the app's documents directory
 * @param {string} uri - URI of the document
 * @param {string} fileName - Name to save the file as
 * @returns {Promise<string|null>} Path to the saved document or null if failed
 */
export const saveDocumentToAppStorage = async (uri, fileName) => {
  try {
    // If already in app directory, just return the path
    if (uri.startsWith(FileSystem.documentDirectory)) {
      return uri;
    }
    
    // Otherwise, save file to documents directory
    const destination = FileSystem.documentDirectory + fileName;
    
    await FileSystem.copyAsync({
      from: uri,
      to: destination
    });
    
    return destination;
  } catch (error) {
    console.error('Error saving document:', error);
    return null;
  }
};

/**
 * Gets a list of saved PDF documents in the app's documents directory
 * @returns {Promise<Array>} Array of document info objects
 */
export const getSavedDocuments = async () => {
  try {
    const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
    
    // Filter for PDF files
    const pdfFiles = files.filter(filename => 
      filename.toLowerCase().endsWith('.pdf')
    );
    
    // Get info for each file
    const documents = await Promise.all(pdfFiles.map(async (filename) => {
      const fileUri = FileSystem.documentDirectory + filename;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      return {
        uri: fileUri,
        name: filename,
        size: fileInfo.size || 0,
        type: 'application/pdf',
        localPath: fileUri,
      };
    }));
    
    return documents;
  } catch (error) {
    console.error('Error getting saved documents:', error);
    return [];
  }
};

/**
 * Deletes a document from the app's storage
 * @param {string} filePath - Path to the document to delete
 * @returns {Promise<boolean>} Whether deletion was successful
 */
export const deleteDocument = async (filePath) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
};