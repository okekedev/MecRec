// src/utils/fsService.js - Simplified version

import * as FileSystem from 'expo-file-system';
import { isWeb } from './platform';

// Simplified unified FileSystem implementation 
const FSService = {
  // Constants needed by the app
  DocumentDirectoryPath: isWeb ? '/web-document-directory' : FileSystem.documentDirectory,
  
  // Core functions
  exists: async (path) => {
    if (isWeb) {
      // For web blob URLs, we can try to fetch
      if (path.startsWith('blob:')) {
        try {
          const response = await fetch(path, { method: 'HEAD' });
          return response.ok;
        } catch (e) {
          return false;
        }
      }
      return true;
    } else {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    }
  },
  
  writeFile: async (path, data, options = {}) => {
    if (isWeb) {
      console.log('Web FS: writing to file', path, '(simulated)');
      return Promise.resolve();
    } else {
      return await FileSystem.writeAsStringAsync(path, data, options);
    }
  },
  
  unlink: async (path) => {
    if (isWeb) {
      // Revoke blob URLs
      if (path.startsWith('blob:')) {
        URL.revokeObjectURL(path);
      }
      return Promise.resolve();
    } else {
      return await FileSystem.deleteAsync(path, { idempotent: true });
    }
  }
};

export default FSService;