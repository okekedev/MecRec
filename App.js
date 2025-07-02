/**
 * MedRec App - Medical Referral Document Processor
 * 
 * @format
 */

import React from 'react';
import { StatusBar, useColorScheme, View, Text, StyleSheet } from 'react-native';
import AuthWrapper from './src/components/AuthWrapper';
import { isWeb } from './src/utils/platform';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [webError, setWebError] = React.useState(null);

  // Handle web-specific initialization
  React.useEffect(() => {
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