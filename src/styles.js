// src/styles/index.js - Complete consolidated styles file
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
  none: {},
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

// ALL COMMON COMPONENT STYLES IN ONE PLACE
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
  
  // LOADING STYLES
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
  },
  loadingCard: {
    backgroundColor: Colors.white,
    padding: Spacing.large,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    ...Shadows.medium,
    width: '80%',
    maxWidth: 300,
  },
  loadingText: {
    marginTop: Spacing.medium,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
  },
  loadingSubtext: {
    marginTop: Spacing.small,
    fontSize: Typography.size.small,
    color: Colors.gray,
  },

  // PROGRESS BAR STYLES
  progressBarContainer: {
    width: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.small,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: Spacing.small,
  },

  // HEADER STYLES
  headerContainer: {
    padding: Spacing.medium,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#edf0f7',
    ...Shadows.soft,
  },
  headerTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  headerText: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
  },
  headerPercentage: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
  },
  headerDetail: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    textAlign: 'center',
  },

  // SECTION STYLES
  sectionContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    marginBottom: Spacing.large,
    ...Shadows.medium,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  sectionTitleIcon: {
    width: 4,
    height: 20,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: Spacing.small,
  },
  sectionTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
  },
  sectionDescription: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
    marginBottom: Spacing.large,
    lineHeight: 22,
  },

  // BUTTON STYLES
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
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
    ...Shadows.soft,
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

  disabledButton: {
    backgroundColor: '#cbd5e1',
    ...Shadows.none,
  },

  // INPUT STYLES
  inputLabel: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.small,
    fontWeight: Typography.weight.medium,
  },
  
  input: {
    backgroundColor: '#f7f9fc',
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.medium,
    borderWidth: 1,
    borderColor: '#edf0f7',
  },

  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // MESSAGE STYLES (Error/Warning/Success)
  errorContainer: {
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.small,
    padding: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    marginBottom: Spacing.medium,
  },
  warningContainer: {
    backgroundColor: '#fff8e6',
    borderRadius: BorderRadius.small,
    padding: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
    marginBottom: Spacing.medium,
  },
  successContainer: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.small,
    padding: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    marginBottom: Spacing.medium,
  },
  messageTitle: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.tiny,
  },
  errorTitle: {
    color: Colors.accent,
  },
  warningTitle: {
    color: Colors.warning,
  },
  successTitle: {
    color: Colors.secondary,
  },
  messageText: {
    fontSize: Typography.size.small,
    color: Colors.black,
    lineHeight: Typography.lineHeight.normal,
  },

  // OVERLAY/MODAL STYLES
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    width: '80%',
    maxWidth: 350,
    alignItems: 'center',
  },
  overlayIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  overlayTitle: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.small,
    textAlign: 'center',
  },
  overlayMessage: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginBottom: Spacing.medium,
    textAlign: 'center',
  },
  
  // TEXT STYLES
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
  
  // LIST STYLES
  listItem: {
    flexDirection: 'row',
    padding: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  
  // STATUS BADGES
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