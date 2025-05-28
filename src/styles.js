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
  
  // Review screen specific colors
  reviewBackground: '#f7f9fc',
  reviewCardBackground: '#ffffff',
  reviewBorder: '#edf0f7',
  reviewInputBackground: '#f8fafc',
  reviewedBackground: '#f0f9ff',
  pendingBackground: '#fff8f0',
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
  // No shadow
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  
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
    backgroundColor: Colors.reviewBackground,
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
  
  reviewCard: {
    backgroundColor: Colors.reviewCardBackground,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.reviewBorder,
    marginBottom: Spacing.medium,
    overflow: 'hidden',
  },
  
  // Button styles
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
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
    backgroundColor: Colors.white,
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
  
  disabledButtonText: {
    color: '#94a3b8',
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
    lineHeight: Typography.size.medium * Typography.lineHeight.normal,
  },
  
  captionText: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  
  // Input styles
  input: {
    backgroundColor: Colors.reviewInputBackground,
    borderWidth: 1,
    borderColor: Colors.reviewBorder,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.medium,
  },
  
  inputLabel: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.small,
    fontWeight: Typography.weight.medium,
  },
  
  multilineInput: {
    minHeight: 120, // Increased from 80 to allow more text
    textAlignVertical: 'top',
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
  
  // Progress styles
  progressContainer: {
    padding: Spacing.medium,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.reviewBorder,
    ...Shadows.soft,
  },
  
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.reviewBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Section styles
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
    lineHeight: Typography.size.medium * Typography.lineHeight.normal,
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.reviewBackground,
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

  // ReviewField specific styles
  reviewFieldContainer: {
    marginBottom: Spacing.medium,
  },
  
  reviewFieldCard: {
    backgroundColor: Colors.reviewCardBackground,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.reviewBorder, // Always neutral border
    marginBottom: Spacing.medium,
    overflow: 'hidden',
  },
  
  // Removed - no longer needed
  // reviewFieldCardPending: { ... }
  // reviewFieldCardReviewed: { ... }
  
  reviewFieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.reviewBorder,
    backgroundColor: '#f8fafc',
  },
  
  reviewFieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  reviewFieldStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.small,
  },
  
  reviewFieldPendingIndicator: {
    backgroundColor: Colors.warning,
  },
  
  reviewFieldReviewedIndicator: {
    backgroundColor: Colors.success,
  },
  
  reviewFieldLabel: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    flex: 1,
  },
  
  reviewFieldToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  reviewFieldStatus: {
    fontSize: Typography.size.small,
    marginRight: Spacing.small,
    fontWeight: Typography.weight.medium,
  },
  
  reviewFieldReviewedStatus: {
    color: Colors.success,
  },
  
  reviewFieldPendingStatus: {
    color: Colors.warning,
  },
  
  reviewFieldInputContainer: {
    padding: Spacing.medium,
    backgroundColor: Colors.white,
  },
  
  reviewFieldReviewedInputContainer: {
    backgroundColor: Colors.reviewedBackground,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },
  
  reviewFieldInput: {
    backgroundColor: Colors.reviewInputBackground,
    borderWidth: 2, // Slightly thicker for better visibility
    borderColor: Colors.reviewBorder,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: 0,
    // No height restrictions - allows unlimited expansion
  },
  
  reviewFieldInputPending: {
    borderColor: Colors.warning, // Yellow border for pending fields
  },
  
  reviewFieldReviewedInput: {
    backgroundColor: Colors.white,
    borderColor: Colors.success, // Green border for reviewed fields
  },
  
  reviewFieldReasoningContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.reviewBorder,
  },
  
  reviewFieldReasoningToggle: {
    padding: Spacing.medium,
    backgroundColor: Colors.reviewInputBackground, // Light grey background instead of green
  },
  
  reviewFieldReasoningToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  reviewFieldReasoningIcon: {
    marginRight: Spacing.small,
  },
  
  reviewFieldReasoningToggleText: {
    fontSize: Typography.size.small,
    color: Colors.black, // Black text instead of green
    fontWeight: Typography.weight.medium,
    flex: 1,
  },
  
  reviewFieldReasoningContentContainer: {
    overflow: 'hidden',
    // No maxHeight restrictions - allows unlimited expansion
  },
  
  reviewFieldReasoningContent: {
    padding: Spacing.medium,
    backgroundColor: Colors.lightGray, // Light grey background instead of green
  },
  
  reviewFieldReasoningLabel: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.semibold,
    color: Colors.black, // Black text instead of green
    marginBottom: Spacing.small,
  },
  
  reviewFieldReasoningTextBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.small,
    padding: Spacing.small,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary, // Blue left border instead of green
  },
  
  reviewFieldReasoningText: {
    fontSize: Typography.size.small,
    color: Colors.black,
    lineHeight: Typography.size.small * Typography.lineHeight.normal,
    // No numberOfLines restriction - allows full text display
  },

  // Progress Overlay styles
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

  // Header styles for progress display
  headerContainer: {
    padding: Spacing.medium,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.reviewBorder,
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
  },
  
  headerDetail: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginTop: Spacing.small,
  },

  // Message/Alert styles
  errorContainer: {
    marginTop: Spacing.medium,
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.small,
    padding: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  
  warningContainer: {
    marginTop: Spacing.medium,
    backgroundColor: '#fff8f0',
    borderRadius: BorderRadius.small,
    padding: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  
  successContainer: {
    marginTop: Spacing.medium,
    backgroundColor: Colors.successLight || '#f0f9ff',
    borderRadius: BorderRadius.small,
    padding: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },
  
  messageTitle: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.tiny,
  },
  
  messageText: {
    fontSize: Typography.size.small,
    color: Colors.black,
    lineHeight: Typography.size.small * Typography.lineHeight.normal,
  },
  
  errorTitle: {
    color: Colors.accent,
  },
  
  warningTitle: {
    color: Colors.warning,
  },
  
  successTitle: {
    color: Colors.success,
  },

  // Progress Overlay styles
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

  // Header styles for progress display
  headerContainer: {
    padding: Spacing.medium,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.reviewBorder,
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
  },
  
  headerDetail: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginTop: Spacing.small,
  },

  // Message/Alert styles
  errorContainer: {
    marginTop: Spacing.medium,
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.small,
    padding: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  
  warningContainer: {
    marginTop: Spacing.medium,
    backgroundColor: '#fff8f0',
    borderRadius: BorderRadius.small,
    padding: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  
  successContainer: {
    marginTop: Spacing.medium,
    backgroundColor: Colors.successLight || '#f0f9ff',
    borderRadius: BorderRadius.small,
    padding: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
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
    color: Colors.success,
  },
  
  // DocumentUploader specific styles
  uploaderContainer: {
    alignItems: 'center',
    width: '100%',
  },
  
  uploadButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.xlarge,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.large,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Shadows.soft,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  
  uploadButtonPressed: {
    opacity: 0.8,
    ...Platform.select({
      web: {
        transform: [{ scale: 0.98 }],
      },
    }),
  },
  
  uploadIcon: {
    marginRight: Spacing.small,
  },
  
  uploadButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  
  documentInfo: {
    backgroundColor: Colors.white,
    padding: Spacing.medium,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.large,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.reviewBorder,
    ...Shadows.soft,
  },
  
  documentIcon: {
    marginRight: Spacing.small,
  },
  
  documentDetails: {
    flex: 1,
  },
  
  documentName: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.medium,
    marginBottom: Spacing.tiny,
    color: Colors.black,
  },
  
  documentSize: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  
  processButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.xlarge,
    borderRadius: BorderRadius.medium,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Shadows.soft,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  
  processIcon: {
    marginRight: Spacing.small,
  },
  
  processButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  
  uploaderDisabledButton: {
    backgroundColor: Colors.gray,
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
      },
    }),
  },
  
  // Header specific styles
  headerSafeArea: {
    width: '100%',
    zIndex: ZIndex.header,
  },
  
  headerElevated: {
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  
  headerContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.large,
  },
  
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  headerRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.medium,
  },
  
  headerLogoButton: {
    height: 30,
    width: 100,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: Spacing.medium,
  },
  
  headerTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    flex: 1,
  },
  
  headerLogoImage: {
    height: 100,
    width: 100,
  },
  
  headerBackIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  headerBackArrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.black,
    transform: [{ rotate: '45deg' }, { translateX: 2 }],
  },
  
  headerIndicator: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  
  headerIndicatorInner: {
    width: 40,
    height: 0,
    backgroundColor: Colors.primaryLight,
    borderRadius: 2,
  },
  
  // HomeScreen specific styles
  homeContainer: {
    flex: 1,
    backgroundColor: '#f7f9fc', // Lighter, clinical background
  },
  
  homeContent: {
    flex: 1,
  },
  
  homeScrollView: {
    flex: 1,
  },
  
  homeScrollContent: {
    padding: Spacing.large,
    paddingBottom: Spacing.xxlarge,
  },
  
  homeWelcomeSection: {
    marginBottom: Spacing.large,
  },
  
  homeWelcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  homeWelcomeDate: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginBottom: Spacing.small,
  },
  
  homeWelcomeTitle: {
    fontSize: Typography.size.xxlarge,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
    marginBottom: Spacing.tiny,
  },
  
  homeWelcomeSubtitle: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
  },
  
  homeLogoContainer: {
    marginLeft: Spacing.medium,
  },
  
  homeLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    ...Shadows.medium,
    overflow: 'hidden',
  },
  
  homeLogoImage: {
    width: '100%',
    height: '100%',
  },
  
  homeMainActionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.large,
    marginBottom: Spacing.large,
    ...Shadows.medium,
  },
  
  homeCardHeader: {
    marginBottom: Spacing.large,
  },
  
  homeCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  
  homeCardTitleIcon: {
    width: 4,
    height: 18,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: Spacing.small,
  },
  
  homeCardTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
  },
  
  homeCardSubtitle: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
    paddingLeft: Spacing.small + 4,
  },
  
  homeDocumentWorkflow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.large,
    paddingHorizontal: Spacing.small,
  },
  
  homeWorkflowStep: {
    alignItems: 'center',
  },
  
  homeStepIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.small,
    ...Shadows.soft,
  },
  
  homeUploadIcon: {
    backgroundColor: '#e8f4fc', // Light blue
  },
  
  homeReviewIcon: {
    backgroundColor: '#e8f7ef', // Light green
  },
  
  homePdfIcon: {
    backgroundColor: '#fbeae9', // Light red
  },
  
  homeStepText: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.medium,
    color: Colors.black,
  },
  
  homeStepConnector: {
    height: 1,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: Spacing.small,
  },
  
  homeBeginButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    alignItems: 'center',
    ...Shadows.soft,
  },
  
  homeBeginButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  
  homeQuickActions: {
    marginBottom: Spacing.large,
  },
  
  homeSectionTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.medium,
  },
  
  homeActionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  homeActionButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    alignItems: 'center',
    width: '48%',
    ...Shadows.soft,
  },
  
  homeActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  
  homeActionUploadIcon: {
    backgroundColor: '#e8f4fc', // Light blue
  },
  
  homeActionFillFormIcon: {
    backgroundColor: '#e8f7ef', // Light green
  },
  
  homeActionLabel: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.medium,
    color: Colors.black,
  },
  
  homeSystemInfo: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    ...Shadows.soft,
  },
  
  homeSystemInfoTitle: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.medium,
  },
  
  homeInfoRow: {
    flexDirection: 'row',
    marginBottom: Spacing.medium,
  },
  
  homeInfoIcon: {
    marginRight: Spacing.small,
    marginTop: 2,
  },
  
  homeSystemInfoText: {
    flex: 1,
    fontSize: Typography.size.small,
    color: Colors.gray,
    lineHeight: 20,
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