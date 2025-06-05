/**
 * AuthWrapper.js - Updated with session warning and auto-logout handling
 */
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, Alert, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MicrosoftAuth from '../services/MicrosoftAuth';
import LoginScreen from '../screens/LoginScreen';
import AppNavigator from '../navigation/AppNavigator';
import { Colors, CommonStyles } from '../styles';

const AuthWrapper = () => {
  const [authState, setAuthState] = useState('checking'); // checking, authenticated, unauthenticated
  const [currentUser, setCurrentUser] = useState(null);
  const [microsoftAuth] = useState(() => MicrosoftAuth.getInstance());
  
  // Session warning state
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(0);

  useEffect(() => {
    // Set up auth listener
    const handleAuthChange = (status, userData) => {
      console.log('Auth status changed:', status);
      
      switch (status) {
        case 'authenticated':
          setAuthState('authenticated');
          setCurrentUser(userData);
          setShowSessionWarning(false); // Hide any session warnings
          break;
          
        case 'unauthenticated':
          setAuthState('unauthenticated');
          setCurrentUser(null);
          setShowSessionWarning(false);
          break;
          
        case 'unauthorized':
          // Handle in LoginScreen
          setAuthState('unauthenticated');
          setCurrentUser(null);
          setShowSessionWarning(false);
          break;
          
        case 'error':
          console.error('Auth error:', userData);
          setAuthState('unauthenticated');
          setCurrentUser(null);
          setShowSessionWarning(false);
          break;
          
        case 'authenticating':
          // Don't change state - let LoginScreen handle loading
          break;
          
        case 'session_warning':
          // Show session expiry warning
          setShowSessionWarning(true);
          setWarningCountdown(Math.floor(userData.timeRemaining / 1000)); // Convert to seconds
          break;
          
        case 'session_expired':
          // Auto-logout occurred
          setAuthState('unauthenticated');
          setCurrentUser(null);
          setShowSessionWarning(false);
          
          // Show alert about session expiry
          setTimeout(() => {
            Alert.alert(
              'Session Expired',
              userData.message || 'Your session has expired due to inactivity.',
              [{ text: 'OK' }]
            );
          }, 500);
          break;
          
        case 'manual_logout':
          // Manual logout occurred
          console.log('📱 Manual logout event received');
          setAuthState('unauthenticated');
          setCurrentUser(null);
          setShowSessionWarning(false);
          console.log('✅ Auth state updated to unauthenticated');
          break;
      }
    };

    microsoftAuth.addListener(handleAuthChange);

    // Cleanup
    return () => {
      microsoftAuth.removeListener(handleAuthChange);
    };
  }, [microsoftAuth]);

  // Countdown timer for session warning
  useEffect(() => {
    let interval;
    
    if (showSessionWarning && warningCountdown > 0) {
      interval = setInterval(() => {
        setWarningCountdown(prev => {
          if (prev <= 1) {
            setShowSessionWarning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showSessionWarning, warningCountdown]);

  const handleAuthSuccess = (user) => {
    setAuthState('authenticated');
    setCurrentUser(user);
  };

  const handleAuthError = (error) => {
    console.error('Authentication error:', error);
  };

  const handleLogout = async () => {
    try {
      console.log('🔒 AuthWrapper handleLogout called');
      await microsoftAuth.manualLogout();
      console.log('✅ MicrosoftAuth.manualLogout completed');
    } catch (error) {
      console.error('❌ Logout error in AuthWrapper:', error);
      // Force logout even if there's an error
      console.log('🔄 Forcing logout state change...');
      setAuthState('unauthenticated');
      setCurrentUser(null);
      setShowSessionWarning(false);
    }
  };

  const handleStayLoggedIn = () => {
    // Reset session timers by simulating activity
    microsoftAuth.lastActivityTime = Date.now();
    microsoftAuth.resetSessionTimers();
    setShowSessionWarning(false);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
      
      {/* Session Warning Modal */}
      <Modal
        visible={showSessionWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSessionWarning(false)}
      >
        <View style={sessionStyles.modalBackdrop}>
          <View style={sessionStyles.warningCard}>
            <View style={sessionStyles.warningHeader}>
              <MaterialCommunityIcons 
                name="clock-alert-outline" 
                size={32} 
                color={Colors.warning} 
              />
              <Text style={sessionStyles.warningTitle}>Session Expiring</Text>
            </View>
            
            <Text style={sessionStyles.warningMessage}>
              Your session will expire in:
            </Text>
            
            <Text style={sessionStyles.countdown}>
              {formatTime(warningCountdown)}
            </Text>
            
            <Text style={sessionStyles.warningSubtext}>
              You will be automatically logged out due to inactivity.
            </Text>
            
            <View style={sessionStyles.buttonContainer}>
              <TouchableOpacity
                style={[sessionStyles.button, sessionStyles.logoutButton]}
                onPress={handleLogout}
              >
                <Text style={sessionStyles.logoutButtonText}>Logout Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[sessionStyles.button, sessionStyles.stayButton]}
                onPress={handleStayLoggedIn}
              >
                <Text style={sessionStyles.stayButtonText}>Stay Logged In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </UserProvider>
  );
};

/**
 * User context provider
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

// Session warning modal styles
const sessionStyles = {
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  warningCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  warningHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.warning,
    marginTop: 8,
  },
  warningMessage: {
    fontSize: 16,
    color: Colors.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  countdown: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  warningSubtext: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: Colors.accent,
  },
  stayButton: {
    backgroundColor: Colors.primary,
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  stayButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
};

export default AuthWrapper;