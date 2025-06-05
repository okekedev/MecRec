/**
 * AuthWrapper.js - Simplified: No roles, just group membership check
 * Replace your existing src/components/AuthWrapper.js with this
 */
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import MicrosoftAuth from '../services/MicrosoftAuth';
import LoginScreen from '../screens/LoginScreen';
import AppNavigator from '../navigation/AppNavigator';
import { Colors, CommonStyles } from '../styles';

const AuthWrapper = () => {
  const [authState, setAuthState] = useState('checking'); // checking, authenticated, unauthenticated
  const [currentUser, setCurrentUser] = useState(null);
  const [microsoftAuth] = useState(() => MicrosoftAuth.getInstance());

  useEffect(() => {
    // Set up auth listener
    const handleAuthChange = (status, userData) => {
      console.log('Auth status changed:', status);
      
      switch (status) {
        case 'authenticated':
          setAuthState('authenticated');
          setCurrentUser(userData);
          break;
          
        case 'unauthenticated':
          setAuthState('unauthenticated');
          setCurrentUser(null);
          break;
          
        case 'unauthorized':
          // Handle in LoginScreen
          setAuthState('unauthenticated');
          setCurrentUser(null);
          break;
          
        case 'error':
          console.error('Auth error:', userData);
          setAuthState('unauthenticated');
          setCurrentUser(null);
          break;
          
        case 'authenticating':
          // Don't change state - let LoginScreen handle loading
          break;
      }
    };

    microsoftAuth.addListener(handleAuthChange);

    // Cleanup
    return () => {
      microsoftAuth.removeListener(handleAuthChange);
    };
  }, [microsoftAuth]);

  const handleAuthSuccess = (user) => {
    setAuthState('authenticated');
    setCurrentUser(user);
  };

  const handleAuthError = (error) => {
    console.error('Authentication error:', error);
  };

  const handleLogout = async () => {
    await microsoftAuth.logout();
  };

  // Show loading screen while checking authentication
  if (authState === 'checking') {
    return (
      <View style={CommonStyles.loadingContainer}>
        <View style={CommonStyles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={CommonStyles.loadingText}>Checking Authentication</Text>
          <Text style={CommonStyles.loadingSubtext}>Looking for existing session...</Text>
        </View>
      </View>
    );
  }

  // Show login screen
  if (authState === 'unauthenticated') {
    return (
      <LoginScreen 
        onAuthSuccess={handleAuthSuccess}
        onAuthError={handleAuthError}
      />
    );
  }

  // Show main app - user is authenticated and in the required group
  return (
    <UserProvider user={currentUser} onLogout={handleLogout}>
      <AppNavigator />
    </UserProvider>
  );
};

/**
 * Simplified User context provider
 */
const UserProvider = ({ user, onLogout, children }) => {
  const contextValue = {
    user,
    onLogout,
    // Simple helper - everyone who gets past auth is authorized
    isAuthorized: () => true,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// Create user context
const UserContext = React.createContext();

// Hook to use user context
export const useUser = () => {
  const context = React.useContext(UserContext);
  if (!context) {
    return { 
      user: null, 
      onLogout: () => {},
      isAuthorized: () => false,
    };
  }
  return context;
};

export default AuthWrapper;