/**
 * AppNavigator.js - Streamlined navigation for clinical document review workflow
 * Modern implementation with simplified screen structure
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import only the screens needed for the streamlined workflow
import HomeScreen from '../screens/HomeScreen';
import DocumentUploadScreen from '../screens/DocumentUploadScreen';
import DocumentReviewScreen from '../screens/DocumentReviewScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();

/**
 * Main navigation component
 * Simplified to focus on the core clinical review workflow:
 * Home → Upload → Review → PDF Preview → Home
 */
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#f7f9fc' }, // Lighter, more clinical background
          presentation: 'card',
          // Add modern transition options
          gestureEnabled: true,
          transitionSpec: {
            open: {
              animation: 'timing',
              config: { duration: 300 }
            },
            close: {
              animation: 'timing',
              config: { duration: 250 }
            }
          },
          // Add subtle card styling
          cardOverlayEnabled: true,
          cardShadowEnabled: true,
          cardStyle: {
            backgroundColor: '#f7f9fc',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }
        }}
      >
        {/* Main dashboard */}
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ 
            title: 'Clinical Dashboard',
            animationEnabled: true,
          }} 
        />
        
        {/* Document upload and processing */}
        <Stack.Screen 
          name="DocumentUpload" 
          component={DocumentUploadScreen}
          options={{ 
            title: 'Upload Medical Document',
            cardStyle: { backgroundColor: '#f7f9fc' },
          }}
        />
        
        {/* Document review screen - core of the workflow */}
        <Stack.Screen 
          name="DocumentReview" 
          component={DocumentReviewScreen}
          options={{ 
            title: 'Clinical Document Review',
            gestureEnabled: false, // Prevent accidental swipe back during review
          }}
        />
        
        {/* PDF generation and preview */}
        <Stack.Screen 
          name="PDFPreview" 
          component={PDFPreviewScreen}
          options={{ 
            title: 'Clinical Report',
            // Slide up animation for report preview
            cardStyleInterpolator: ({ current, layouts }) => ({
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                }),
              },
            }),
          }}
        />
        
        {/* Settings screen */}
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ 
            title: 'Settings',
            // Slide in from right animation
            cardStyleInterpolator: ({ current, layouts }) => ({
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            }),
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;