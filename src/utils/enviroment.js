// src/utils/environment.js - Updated helper using EXPO_PUBLIC_ variables
import Constants from 'expo-constants';

// Environment variable helper that uses EXPO_PUBLIC_ variables
export const getEnvironmentVariable = (key, fallback = null) => {
  // Use EXPO_PUBLIC_ prefixed variables (inlined at build time)
  const publicKey = `EXPO_PUBLIC_${key}`;
  if (typeof process !== 'undefined' && process.env && process.env[publicKey]) {
    return process.env[publicKey];
  }
  
  // Fallback to expo-constants if needed
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  return fallback;
};

// Azure configuration - your existing code can use this unchanged
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

// Debug helper
export const debugEnvironmentVariables = () => {
  console.log('=== Environment Variables Debug ===');
  console.log('EXPO_PUBLIC_AZURE_TENANT_ID:', process.env.EXPO_PUBLIC_AZURE_TENANT_ID ? 'SET' : 'NOT SET');
  console.log('EXPO_PUBLIC_AZURE_CLIENT_ID:', process.env.EXPO_PUBLIC_AZURE_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('EXPO_PUBLIC_AZURE_REQUIRED_GROUP:', process.env.EXPO_PUBLIC_AZURE_REQUIRED_GROUP ? 'SET' : 'NOT SET');
  console.log('Final azureConfig:', azureConfig);
  console.log('=== End Debug ===');
};