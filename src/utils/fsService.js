import * as FileSystem from 'expo-file-system';
import { isWeb } from './platform';

// Simplified unified FileSystem implementation 
const FSService = {
  // Constants needed by the app
  DocumentDirectoryPath: isWeb ? '/web-document-directory' : FileSystem.documentDirectory,
  
  // Basic operations
  exists: async (path) => {
    if (isWeb) {
      console.log('Web FS: exists check for', path);
      // For web blob URLs, we can try to fetch
      if (path.startsWith('blob:')) {
        try {
          const response = await fetch(path, { method: 'HEAD' });
          return response.ok;
        } catch (e) {
          return false;
        }
      }
      // For other web paths, assume true
      return true;
    } else {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    }
  },
  
  readFile: async (path, encoding = 'utf8') => {
    if (isWeb) {
      console.log('Web FS: reading file', path);
      // For web blob URLs, we can fetch content
      if (path.startsWith('blob:')) {
        const response = await fetch(path);
        return await response.text();
      }
      // Return empty content for other web paths
      return '';
    } else {
      return await FileSystem.readAsStringAsync(path, { encoding });
    }
  },
  
  writeFile: async (path, data, encoding = 'utf8') => {
    if (isWeb) {
      console.log('Web FS: writing to file', path, '(simulated)');
      return Promise.resolve();
    } else {
      return await FileSystem.writeAsStringAsync(path, data, { encoding });
    }
  },
  
  unlink: async (path) => {
    if (isWeb) {
      console.log('Web FS: deleting file', path, '(simulated)');
      // Revoke blob URLs
      if (path.startsWith('blob:')) {
        URL.revokeObjectURL(path);
      }
      return Promise.resolve();
    } else {
      return await FileSystem.deleteAsync(path, { idempotent: true });
    }
  },
  
  copyFile: async (source, destination) => {
    if (isWeb) {
      console.log('Web FS: copying file from', source, 'to', destination, '(simulated)');
      return Promise.resolve();
    } else {
      return await FileSystem.copyAsync({
        from: source,
        to: destination
      });
    }
  },
  
  readDir: async (path) => {
    if (isWeb) {
      console.log('Web FS: reading directory', path, '(simulated)');
      return [];
    } else {
      const files = await FileSystem.readDirectoryAsync(path);
      
      // Convert to consistent format across platforms
      return files.map(name => ({
        name,
        path: path + '/' + name,
        size: 0, // We would need to call getInfoAsync to get the size
      }));
    }
  },
};

export default FSService;