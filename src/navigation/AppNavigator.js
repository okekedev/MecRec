// src/navigation/AppNavigator.js - Update to include new screens
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import DocumentUploadScreen from '../screens/DocumentUploadScreen';
import DocumentViewerScreen from '../screens/DocumentViewerScreen';
import DocumentListScreen from '../screens/DocumentListScreen';
import DocumentChatScreen from '../screens/DocumentChatScreen';
import DocumentReviewScreen from '../screens/DocumentReviewScreen'; // New
import PDFPreviewScreen from '../screens/PDFPreviewScreen'; // New
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#f5f5f7' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen 
          name="DocumentUpload" 
          component={DocumentUploadScreen}
          options={{ title: 'Upload Document' }}
        />
        <Stack.Screen 
          name="DocumentViewer" 
          component={DocumentViewerScreen}
          options={{ title: 'Document Viewer' }}
        />
        <Stack.Screen 
          name="DocumentList" 
          component={DocumentListScreen}
          options={{ title: 'Your Documents' }}
        />
        <Stack.Screen 
          name="DocumentChat" 
          component={DocumentChatScreen}
          options={{ title: 'Document Chat' }}
        />
        <Stack.Screen 
          name="DocumentReview" 
          component={DocumentReviewScreen}
          options={{ title: 'Document Review' }}
        />
        <Stack.Screen 
          name="PDFPreview" 
          component={PDFPreviewScreen}
          options={{ title: 'PDF Preview' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;