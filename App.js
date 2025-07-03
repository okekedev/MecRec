/**
 * MedRec App - Medical Referral Document Processor
 * 
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, View, Text, StyleSheet, Platform } from 'react-native';
import AuthWrapper from './src/components/AuthWrapper';
import { isWeb } from './src/utils/platform';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [webError, setWebError] = React.useState(null);

  // Inject scrollbar CSS for web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const scrollbarCSS = `
        /* Force scrollbar visibility for all browsers */
        ::-webkit-scrollbar {
          width: 12px !important;
          height: 12px !important;
        }

        ::-webkit-scrollbar-track {
          background: #f1f1f1 !important;
          border-radius: 6px !important;
        }

        ::-webkit-scrollbar-thumb {
          background: #888 !important;
          border-radius: 6px !important;
          border: 2px solid #f1f1f1 !important;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #555 !important;
        }

        ::-webkit-scrollbar-corner {
          background: #f1f1f1 !important;
        }

        /* Firefox */
        * {
          scrollbar-width: thin !important;
          scrollbar-color: #888 #f1f1f1 !important;
        }

        /* Force scrollbars to always be visible */
        body {
          overflow: auto !important;
        }

        /* React Native Web ScrollView components */
        div[data-focusable="true"] {
          overflow: auto !important;
          scrollbar-width: thin !important;
          scrollbar-color: #888 #f1f1f1 !important;
        }

        div[data-focusable="true"]::-webkit-scrollbar {
          width: 12px !important;
          height: 12px !important;
        }

        div[data-focusable="true"]::-webkit-scrollbar-track {
          background: #f1f1f1 !important;
          border-radius: 6px !important;
        }

        div[data-focusable="true"]::-webkit-scrollbar-thumb {
          background: #888 !important;
          border-radius: 6px !important;
          border: 2px solid #f1f1f1 !important;
        }

        div[data-focusable="true"]::-webkit-scrollbar-thumb:hover {
          background: #555 !important;
        }

        /* Override any styles that might be hiding scrollbars */
        * {
          -ms-overflow-style: auto !important;
        }

        /* Ensure all scrollable containers show scrollbars */
        *[style*="overflow: auto"],
        *[style*="overflow: scroll"],
        *[style*="overflow-y: auto"],
        *[style*="overflow-y: scroll"] {
          scrollbar-width: thin !important;
          scrollbar-color: #888 #f1f1f1 !important;
        }

        *[style*="overflow: auto"]::-webkit-scrollbar,
        *[style*="overflow: scroll"]::-webkit-scrollbar,
        *[style*="overflow-y: auto"]::-webkit-scrollbar,
        *[style*="overflow-y: scroll"]::-webkit-scrollbar {
          width: 12px !important;
          display: block !important;
        }

        *[style*="overflow: auto"]::-webkit-scrollbar-track,
        *[style*="overflow: scroll"]::-webkit-scrollbar-track,
        *[style*="overflow-y: auto"]::-webkit-scrollbar-track,
        *[style*="overflow-y: scroll"]::-webkit-scrollbar-track {
          background: #f1f1f1 !important;
        }

        *[style*="overflow: auto"]::-webkit-scrollbar-thumb,
        *[style*="overflow: scroll"]::-webkit-scrollbar-thumb,
        *[style*="overflow-y: auto"]::-webkit-scrollbar-thumb,
        *[style*="overflow-y: scroll"]::-webkit-scrollbar-thumb {
          background: #888 !important;
          border-radius: 6px !important;
        }
      `;

      const style = document.createElement('style');
      style.textContent = scrollbarCSS;
      document.head.appendChild(style);

      // Cleanup function to remove the style when component unmounts
      return () => {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      };
    }
  }, []);

  // Handle web-specific initialization
  useEffect(() => {
    if (isWeb) {
      // Check if any required web APIs are missing
      const checkWebCompatibility = () => {
        try {
          // Any web-specific compatibility checks can go here
          return null; // No errors
        } catch (error) {
          return 'Some browser features required by this app are not available.';
        }
      };

      setWebError(checkWebCompatibility());
    }
  }, []);

  // Web error fallback
  if (isWeb && webError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Compatibility Issue</Text>
        <Text style={styles.errorMessage}>{webError}</Text>
        <Text style={styles.errorHint}>
          This app works best in Chrome, Firefox, or Safari.
        </Text>
      </View>
    );
  }

  return (
    <>
      {!isWeb && (
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? '#000000' : '#ffffff'}
        />
      )}
      <AuthWrapper />
    </>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f7',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorHint: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  }
});

export default App;