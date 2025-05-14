import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

// Helper functions for platform-specific code
export const platformSpecific = (webImpl, nativeImpl) => {
  return isWeb ? webImpl : nativeImpl;
};