// src/utils/environment.js - Helper for accessing environment variables with Metro
import Constants from 'expo-constants';

// Environment variable helper that works with both Metro and runtime
export const getEnvironmentVariable = (key, fallback = null) => {
  // First try process.env (build-time variables)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  // Then try expo-constants extra config
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  // Finally try manifest extra (legacy)
  if (Constants.manifest?.extra?.[key]) {
    return Constants.manifest.extra[key];
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
    return false;
  }
  
  return true;
};

// Debug helper to check what environment variables are available
export const debugEnvironmentVariables = () => {
  console.log('Environment Variables Debug:');
  console.log('process.env.AZURE_TENANT_ID:', process.env.AZURE_TENANT_ID ? 'SET' : 'NOT SET');
  console.log('process.env.AZURE_CLIENT_ID:', process.env.AZURE_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('process.env.AZURE_REQUIRED_GROUP:', process.env.AZURE_REQUIRED_GROUP ? 'SET' : 'NOT SET');
  console.log('Constants.expoConfig.extra:', Constants.expoConfig?.extra);
  console.log('azureConfig:', azureConfig);
};