// src/utils/environment.js - Helper for accessing environment variables with Metro
import Constants from 'expo-constants';

// Environment variable helper that works with both Metro and runtime
export const getEnvironmentVariable = (key, fallback = null) => {
  // First try process.env (build-time variables)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  // Then try expo-constants extra config (from app.config.js)
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  // Also try Constants.manifest.extra (legacy support)
  if (Constants.manifest?.extra?.[key]) {
    return Constants.manifest.extra[key];
  }
  
  // Finally try the legacy Constants.manifest2.extra (Expo SDK 48+)
  if (Constants.manifest2?.extra?.expoClient?.extra?.[key]) {
    return Constants.manifest2.extra.expoClient.extra[key];
  }
  
  return fallback;
};

// Azure configuration with fallbacks
export const azureConfig = {
  tenantId: getEnvironmentVariable('AZURE_TENANT_ID'),
  clientId: getEnvironmentVariable('AZURE_CLIENT_ID'),
  requiredGroup: getEnvironmentVariable('AZURE_REQUIRED_GROUP'),
};

// Validate that all required environment variables are present
export const validateEnvironmentVariables = () => {
  const required = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_REQUIRED_GROUP'];
  const missing = required.filter(key => !getEnvironmentVariable(key));
  
  if (missing.length > 0) {
    console.warn('Missing required environment variables:', missing);
    console.warn('Available Constants:', {
      expoConfig: Constants.expoConfig?.extra,
      manifest: Constants.manifest?.extra,
      manifest2: Constants.manifest2?.extra?.expoClient?.extra,
    });
    return false;
  }
  
  return true;
};

// Debug helper to check what environment variables are available
export const debugEnvironmentVariables = () => {
  console.log('=== Environment Variables Debug ===');
  console.log('process.env.AZURE_TENANT_ID:', process.env.AZURE_TENANT_ID ? 'SET' : 'NOT SET');
  console.log('process.env.AZURE_CLIENT_ID:', process.env.AZURE_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('process.env.AZURE_REQUIRED_GROUP:', process.env.AZURE_REQUIRED_GROUP ? 'SET' : 'NOT SET');
  console.log('Constants.expoConfig.extra:', Constants.expoConfig?.extra);
  console.log('Constants.manifest.extra:', Constants.manifest?.extra);
  console.log('Constants.manifest2.extra:', Constants.manifest2?.extra?.expoClient?.extra);
  console.log('azureConfig:', azureConfig);
  console.log('=== End Debug ===');
};