// src/utils/documentUtils.js - Enhanced and consolidated version

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { isWeb } from './platform';

/**
 * Opens document picker to select a PDF file
 * @returns {Promise<Object|null>} Document info object or null
 */
export const pickPdfDocument = async () => {
  try {
    if (isWeb) {
      return await pickWebPdfDocument();
    } else {
      return await pickNativePdfDocument();
    }
  } catch (error) {
    console.error('Error picking document:', error);
    return null;
  }
};

/**
 * Native implementation of document picker
 */
const pickNativePdfDocument = async () => {
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
};

/**
 * Web implementation of document picker
 */
const pickWebPdfDocument = async () => {
  return new Promise((resolve, reject) => {
    // Web-specific implementation
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const fileUrl = URL.createObjectURL(file);
      
      const document = {
        uri: fileUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        localPath: fileUrl,
        timestamp: Date.now()
      };
      
      resolve(document);
    };
    
    input.click();
  });
};

/**
 * Saves a document to the app's documents directory
 * @param {string} uri - URI of the document
 * @param {string} fileName - Name to save the file as
 * @returns {Promise<string|null>} Path to the saved document or null if failed
 */
export const saveDocumentToAppStorage = async (uri, fileName) => {
  try {
    if (isWeb) {
      // In web, we don't need to save the file, just return the URI
      return uri;
    }
    
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
 * Save PDF data to a file
 * @param {string} pdfData - PDF data (base64 or dataUrl)
 * @param {string} fileName - Filename to save as
 * @returns {Promise<string|null>} Path to saved file or null
 */
export const savePdfToFile = async (pdfData, fileName) => {
  try {
    if (isWeb) {
      // For web, trigger download
      const link = document.createElement('a');
      link.href = pdfData;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return fileName; // Just return the filename for web
    } else {
      // For native platforms
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Remove the data URL prefix if present
      let base64Data = pdfData;
      if (pdfData.startsWith('data:application/pdf;base64,')) {
        base64Data = pdfData.split(',')[1];
      }
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, { 
        encoding: FileSystem.EncodingType.Base64 
      });
      
      return fileUri;
    }
  } catch (error) {
    console.error('Error saving PDF:', error);
    return null;
  }
};