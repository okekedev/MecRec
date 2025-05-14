/**
 * Global styles for the MedRec application
 * This file contains consistent styling variables and common component styles
 */
import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Device detection
const isSmallDevice = width < 375;
const isTablet = Math.min(width, height) >= 600;

// Color palette
export const Colors = {
  // Primary colors
  primary: '#3498db',          // Main app color
  primaryDark: '#2980b9',      // Darker version for pressed states
  primaryLight: '#e8f4fc',     // Light version for backgrounds
  
  // Secondary colors
  secondary: '#27ae60',        // Secondary action color
  secondaryDark: '#219653',    // Darker version
  secondaryLight: '#e8f7ef',   // Light version for backgrounds
  
  // Accent colors
  accent: '#e74c3c',           // For important items or alerts
  accentDark: '#c0392b',       // Darker version
  accentLight: '#fbeae9',      // Light version for backgrounds
  
  // Neutral colors
  black: '#2c3e50',            // For primary text
  gray: '#7f8c8d',             // For secondary text
  lightGray: '#ecf0f1',        // For backgrounds, borders
  white: '#ffffff',            // For card backgrounds
  
  // Semantic colors
  success: '#2ecc71',
  warning: '#f39c12',
  error: '#e74c3c',
  info: '#3498db',
  
  // Document type colors
  docPdf: '#3498db',
  docReferral: '#e74c3c',
  docLab: '#2ecc71',
  docImaging: '#9b59b6',
  docReport: '#f39c12',
  
  // Status colors
  statusProcessed: '#27ae60',
  statusPending: '#f39c12',
  statusOcr: '#3498db',
  statusFailed: '#e74c3c',
};

// Typography
export const Typography = {
  // Font families - you can replace these with your preferred fonts
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  }),
  
  // Font sizes
  size: {
    tiny: isSmallDevice ? 10 : 12,
    small: isSmallDevice ? 12 : 14,
    medium: isSmallDevice ? 14 : 16,
    large: isSmallDevice ? 16 : 18,
    xlarge: isSmallDevice ? 18 : 20,
    xxlarge: isSmallDevice ? 20 : 24,
    huge: isSmallDevice ? 24 : 30,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    loose: 1.75,
  },
  
  // Font weights
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Spacing
export const Spacing = {
  tiny: isSmallDevice ? 4 : 5,
  small: isSmallDevice ? 8 : 10,
  medium: isSmallDevice ? 12 : 15,
  large: isSmallDevice ? 16 : 20,
  xlarge: isSmallDevice ? 24 : 30,
  xxlarge: isSmallDevice ? 32 : 40,
};

// Border radius
export const BorderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  xlarge: 16,
  round: 1000,  // Effectively round
};

// Shadows
export const Shadows = {
  // Soft shadow
  soft: Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    },
  }),
  
  // Medium shadow
  medium: Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.15)',
    },
  }),
  
  // Strong shadow
  strong: Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
    },
    android: {
      elevation: 8,
    },
    web: {
      boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.2)',
    },
  }),
};

// Z-index
export const ZIndex = {
  base: 1,
  card: 5,
  header: 10,
  modal: 50,
  toast: 100,
  overlay: 500,
};

// Common component styles
export const CommonStyles = StyleSheet.create({
  // Container styles
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  
  contentContainer: {
    padding: Spacing.large,
  },
  
  // Card styles
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    marginBottom: Spacing.large,
    ...Shadows.soft,
  },
  
  // Button styles
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  primaryButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  
  secondaryButton: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  secondaryButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  
  outlineButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  outlineButtonText: {
    color: Colors.primary,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  
  // Text styles
  title: {
    fontSize: Typography.size.xxlarge,
    color: Colors.black,
    fontWeight: Typography.weight.bold,
    marginBottom: Spacing.medium,
  },
  
  subtitle: {
    fontSize: Typography.size.large,
    color: Colors.black,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.medium,
  },
  
  bodyText: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    lineHeight: Typography.lineHeight.normal,
  },
  
  captionText: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  
  // Input styles
  input: {
    height: 50,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.medium,
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.medium,
  },
  
  inputLabel: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginBottom: Spacing.tiny,
    fontWeight: Typography.weight.medium,
  },
  
  // List styles
  listItem: {
    flexDirection: 'row',
    padding: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  
  // Status badges
  badge: {
    paddingVertical: Spacing.tiny,
    paddingHorizontal: Spacing.small,
    borderRadius: BorderRadius.small,
    alignSelf: 'flex-start',
  },
  
  badgeText: {
    fontSize: Typography.size.tiny,
    fontWeight: Typography.weight.medium,
    color: Colors.white,
  },
});

// Layout helpers
export const Layout = {
  isSmallDevice,
  isTablet,
  screenWidth: width,
  screenHeight: height,
  
  // Common layout styles
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  column: {
    flexDirection: 'column',
  },
  
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  spaceBetween: {
    justifyContent: 'space-between',
  },
};

// Export everything as a single object for convenience
export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  ZIndex,
  CommonStyles,
  Layout,
};