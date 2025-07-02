// src/utils/environment.js - Enhanced debugging version
import Constants from 'expo-constants';

// Environment variable helper that uses EXPO_PUBLIC_ variables
export const getEnvironmentVariable = (key, fallback = null) => {
  // Use EXPO_PUBLIC_ prefixed variables (inlined at build time)
  const publicKey = `EXPO_PUBLIC_${key}`;
  
  console.log(`[ENV DEBUG] Looking for key: ${key} -> ${publicKey}`);
  console.log(`[ENV DEBUG] process.env[${publicKey}]:`, process.env[publicKey]);
  
  if (typeof process !== 'undefined' && process.env && process.env[publicKey]) {
    console.log(`[ENV DEBUG] Found ${publicKey}:`, process.env[publicKey]);
    return process.env[publicKey];
  }
  
  // Fallback to expo-constants if needed
  if (Constants.expoConfig?.extra?.[key]) {
    console.log(`[ENV DEBUG] Found in Constants.expoConfig.extra[${key}]:`, Constants.expoConfig.extra[key]);
    return Constants.expoConfig.extra[key];
  }
  
  console.log(`[ENV DEBUG] No value found for ${key}, using fallback:`, fallback);
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

// Comprehensive debug helper
export const debugEnvironmentVariables = () => {
  console.log('=== COMPREHENSIVE Environment Variables Debug ===');
  
  // Check direct access
  console.log('=== DIRECT ACCESS ===');
  console.log('process.env.EXPO_PUBLIC_AZURE_TENANT_ID:', process.env.EXPO_PUBLIC_AZURE_TENANT_ID);
  console.log('process.env.EXPO_PUBLIC_AZURE_CLIENT_ID:', process.env.EXPO_PUBLIC_AZURE_CLIENT_ID);
  console.log('process.env.EXPO_PUBLIC_AZURE_REQUIRED_GROUP:', process.env.EXPO_PUBLIC_AZURE_REQUIRED_GROUP);
  
  // Check all EXPO_PUBLIC vars
  console.log('=== ALL EXPO_PUBLIC VARIABLES ===');
  const expoPublicVars = Object.keys(process.env || {}).filter(key => key.startsWith('EXPO_PUBLIC_'));
  console.log('Found EXPO_PUBLIC variables:', expoPublicVars);
  expoPublicVars.forEach(key => {
    console.log(`${key}:`, process.env[key]);
  });
  
  // Check Constants
  console.log('=== EXPO CONSTANTS ===');
  console.log('Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
  console.log('Constants.manifest?.extra:', Constants.manifest?.extra);
  
  // Check final config
  console.log('=== FINAL AZURE CONFIG ===');
  console.log('azureConfig:', azureConfig);
  
  // Validation result
  console.log('=== VALIDATION RESULT ===');
  const isValid = validateEnvironmentVariables();
  console.log('Environment variables valid:', isValid);
  
  console.log('=== END COMPREHENSIVE DEBUG ===');
};

// Simple test function you can call
export const testEnvironmentVariables = () => {
  console.log('=== SIMPLE TEST ===');
  console.log('Tenant ID:', azureConfig.tenantId || 'MISSING');
  console.log('Client ID:', azureConfig.clientId || 'MISSING');
  console.log('Required Group:', azureConfig.requiredGroup || 'MISSING');
  console.log('=== END SIMPLE TEST ===');
};