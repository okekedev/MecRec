/**
 * LoginScreen.js - Professional Microsoft Authentication
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Animated,
  Image,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import MicrosoftAuth from '../services/MicrosoftAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';
import * as Animations from '../animations';

const LoginScreen = ({ onAuthSuccess, onAuthError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [microsoftAuth] = useState(() => MicrosoftAuth.getInstance());
  
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  
  // Start animations on mount
  useEffect(() => {
    Animated.parallel([
      Animations.fadeIn(fadeAnim, 800),
      Animations.slideInUp(slideAnim, 50, 600),
      Animations.zoomIn(logoScale, 0.8, 700)
    ]).start();
  }, []);
  
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await microsoftAuth.authenticate();
      
      if (result.success) {
        // Success - user is in the medrec group
        onAuthSuccess(result.user);
      } else {
        // Handle different error types
        if (result.user) {
          // User authenticated but not in required group
          setError(result.error);
          setTimeout(() => {
            Alert.alert(
              'Access Denied',
              `Hello ${result.user.displayName},\n\n${result.error}\n\nPlease contact your IT administrator to be added to the 'medrec' group.`,
              [{ text: 'OK' }]
            );
          }, 100);
        } else {
          // Authentication failed
          setError(result.error || 'Authentication failed');
        }
        
        if (onAuthError) {
          onAuthError(result.error);
        }
      }
      
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      if (onAuthError) {
        onAuthError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Professional Header with logo */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: logoScale }
              ]
            }
          ]}
        >
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/medreclogo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.appTitle}>MedRec</Text>
          <Text style={styles.appSubtitle}>Clinical Document Review Platform</Text>
          
          {/* Professional security badge */}
          <View style={styles.securityBadge}>
            <MaterialCommunityIcons 
              name="shield-check-outline" 
              size={16} 
              color={Colors.success} 
              style={styles.securityIcon}
            />
            <Text style={styles.securityText}>Enterprise Authentication</Text>
          </View>
        </Animated.View>
        
        {/* Professional Login card */}
        <Animated.View 
          style={[
            styles.loginCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons 
              name="microsoft" 
              size={28} 
              color="#0078d4" 
              style={styles.microsoftIcon}
            />
            <Text style={styles.cardTitle}>Sign In</Text>
          </View>
          
          <Text style={styles.cardDescription}>
            Use your organizational Microsoft account to access the application.
          </Text>
          
          {/* Error message */}
          {error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={18} color={Colors.accent} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          {/* Professional Login button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              loading && styles.disabledButton
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator color={Colors.white} size="small" />
                <Text style={styles.loadingText}>Authenticating...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <MaterialCommunityIcons 
                  name="microsoft" 
                  size={18} 
                  color={Colors.white} 
                  style={styles.buttonIcon}
                />
                <Text style={styles.loginButtonText}>
                  Continue with Microsoft
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Professional Help section */}
          <View style={styles.helpSection}>
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Need Help?</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <Text style={styles.helpText}>
              Contact your system administrator for account access or technical support.
            </Text>
          </View>
        </Animated.View>
        
        {/* Professional Footer */}
        <Animated.View 
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.infoRow}>
            <MaterialCommunityIcons 
              name="lock-outline" 
              size={14} 
              color={Colors.gray} 
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              Secured by Microsoft Azure Active Directory
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons 
              name="medical-bag" 
              size={14} 
              color={Colors.gray} 
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              HIPAA Compliant Healthcare Platform
            </Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // More professional light gray
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 72,
    height: 72,
    backgroundColor: Colors.white,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Shadows.medium,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  logo: {
    width: 48,
    height: 48,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '400',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  securityIcon: {
    marginRight: 6,
  },
  securityText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loginCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    ...Shadows.medium,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  microsoftIcon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '400',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  loginButton: {
    backgroundColor: '#0078d4',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: '#106ebe',
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
    borderColor: '#94a3b8',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.white,
    fontSize: 15,
    marginLeft: 8,
    fontWeight: '500',
  },
  helpSection: {
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e1e5e9',
  },
  dividerText: {
    fontSize: 13,
    color: '#64748b',
    marginHorizontal: 16,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '400',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '400',
  },
};

export default LoginScreen;