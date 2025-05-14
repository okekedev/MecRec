import { isWeb } from './platform';
import * as webDocumentPicker from './webDocumentPicker';

// Only import native modules if not on web
let DocumentPicker: any;
let RNFS: any;

if (!isWeb) {
  DocumentPicker = require('react-native-document-picker').default;
  RNFS = require('react-native-fs').default;
}

export interface DocumentInfo {
  uri: string;
  name: string;
  size: number;
  type: string;
  localPath?: string;
}

/**
 * Opens document picker to select a PDF file
 */
export const pickPdfDocument = async (): Promise<DocumentInfo | null> => {
  if (isWeb) {
    return webDocumentPicker.pickPdfDocument();
  }
  
  try {
    const result = await DocumentPicker.pick({
      type: [DocumentPicker.types.pdf],
      copyTo: 'documentDirectory',
    });
    
    if (result && result.length > 0) {
      const document = result[0];
      
      // Create a local copy of the document
      let localPath;
      if (document.fileCopyUri) {
        localPath = document.fileCopyUri;
      } else {
        // If fileCopyUri is not available, create a copy manually
        const fileName = document.name || `document-${Date.now()}.pdf`;
        localPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
        
        if (document.uri.startsWith('content://') || document.uri.startsWith('file://')) {
          await RNFS.copyFile(document.uri, localPath);
        }
      }
      
      return {
        uri: document.uri,
        name: document.name || 'document.pdf',
        size: document.size || 0,
        type: document.type || 'application/pdf',
        localPath,
      };
    }
    
    return null;
  } catch (error) {
    if (!isWeb && !DocumentPicker.isCancel(error)) {
      console.error('Error picking document:', error);
    }
    return null;
  }
};

/**
 * Saves a document to the app's documents directory
 */
export const saveDocumentToAppStorage = async (
  uri: string, 
  fileName: string
): Promise<string | null> => {
  if (isWeb) {
    return webDocumentPicker.saveDocumentToAppStorage(uri, fileName);
  }
  
  try {
    const destinationPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    
    if (uri.startsWith('file://')) {
      // Copy from file URI
      await RNFS.copyFile(uri, destinationPath);
    } else if (uri.startsWith('content://')) {
      // For content URIs
      await RNFS.copyFile(uri, destinationPath);
    } else {
      // For remote URIs
      await RNFS.downloadFile({
        fromUrl: uri,
        toFile: destinationPath,
      }).promise;
    }
    
    return destinationPath;
  } catch (error) {
    console.error('Error saving document:', error);
    return null;
  }
};

/**
 * Gets a list of saved PDF documents in the app's documents directory
 */
export const getSavedDocuments = async (): Promise<DocumentInfo[]> => {
  if (isWeb) {
    return webDocumentPicker.getSavedDocuments();
  }
  
  try {
    const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
    
    // Filter for PDF files
    const pdfFiles = files.filter(file => 
      file.name.toLowerCase().endsWith('.pdf')
    );
    
    return pdfFiles.map(file => ({
      uri: file.path,
      name: file.name,
      size: file.size,
      type: 'application/pdf',
      localPath: file.path,
    }));
  } catch (error) {
    console.error('Error getting saved documents:', error);
    return [];
  }
};

/**
 * Deletes a document from the app's storage
 */
export const deleteDocument = async (filePath: string): Promise<boolean> => {
  if (isWeb) {
    return webDocumentPicker.deleteDocument(filePath);
  }
  
  try {
    if (await RNFS.exists(filePath)) {
      await RNFS.unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
};