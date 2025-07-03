/**
 * Header.js - Modern clinical header component with logout button and MedRec text
 */
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  SafeAreaView,
  Image,
  Alert,
  Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MicrosoftAuth from '../services/MicrosoftAuth'; // Import directly
import { useUser } from './AuthWrapper';
import { Colors, CommonStyles } from '../styles';

const Header = ({
  title = '',
  showBackButton = false,
  rightComponent = null,
  onMenuPress = null,
  backgroundColor = '#ffffff',
  textColor = '#2c3e50',
  elevated = true,
  showLogo = true,
}) => {
  const navigation = useNavigation();
  const { user, onLogout } = useUser();
  const microsoftAuth = MicrosoftAuth.getInstance(); // Direct access as fallback
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    }
  };

  const handleLogoutPress = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    
    try {
      // Try context logout first
      if (onLogout) {
        await onLogout();
      } else {
        await microsoftAuth.manualLogout();
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <SafeAreaView 
      style={[
        CommonStyles.headerSafeArea, 
        { backgroundColor },
        elevated && CommonStyles.headerElevated
      ]}
    >
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={backgroundColor} 
      />
      <View style={CommonStyles.headerContainer}>
        <View style={CommonStyles.headerLeftSection}>
          {showBackButton ? (
            <TouchableOpacity
              style={CommonStyles.headerIconButton}
              onPress={handleBackPress}
              accessibilityLabel="Back"
              accessibilityRole="button"
            >
              <View style={CommonStyles.headerBackIcon}>
                <View style={CommonStyles.headerBackArrow} />
              </View>
            </TouchableOpacity>
          ) : showLogo ? (
            <TouchableOpacity
              style={styles.headerLogoSection}
              onPress={handleMenuPress}
              accessibilityLabel="Menu"
              accessibilityRole="button"
            >
              <Text style={styles.medrecText}>MedRec</Text>
            </TouchableOpacity>
          ) : null}
          
          {title ? (
            <Text 
              style={[
                CommonStyles.headerTitle, 
                { color: textColor }
              ]}
            >
              {title}
            </Text>
          ) : null}
        </View>
        
        <View style={CommonStyles.headerRightSection}>
          {/* User info and logout button */}
          {user && (
            <View style={styles.userSection}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.givenName || user.displayName || 'User'}
                </Text>
                <Text style={styles.userRole}>
                  Healthcare Professional
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogoutPress}
                accessibilityLabel="Logout"
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="logout" 
                  size={20} 
                  color={Colors.accent} 
                />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Any additional right component */}
          {rightComponent}
        </View>
      </View>
      
      {/* Modern line indicator */}
      {elevated && (
        <View style={CommonStyles.headerIndicator}>
          <View style={CommonStyles.headerIndicatorInner} />
        </View>
      )}
      
      {/* Custom Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={logoutModalStyles.modalBackdrop}>
          <View style={logoutModalStyles.modalCard}>
            <View style={logoutModalStyles.modalHeader}>
              <MaterialCommunityIcons 
                name="logout" 
                size={28}
                color="#0078d4"
              />
              <Text style={logoutModalStyles.modalTitle}>Sign Out</Text>
            </View>
            
            <Text style={logoutModalStyles.modalMessage}>
              Are you sure you want to sign out, {user?.givenName || user?.displayName || 'User'}?
            </Text>
            
            <View style={logoutModalStyles.buttonContainer}>
              <TouchableOpacity
                style={[logoutModalStyles.button, logoutModalStyles.cancelButton]}
                onPress={handleCancelLogout}
                activeOpacity={0.8}
              >
                <Text style={logoutModalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[logoutModalStyles.button, logoutModalStyles.logoutButton]}
                onPress={handleConfirmLogout}
                activeOpacity={0.8}
              >
                <Text style={logoutModalStyles.logoutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = {
  // Logo section with just MedRec text
  headerLogoSection: {
    height: 30,
    justifyContent: 'center',
    marginRight: 15, // Spacing before title
  },
  
  medrecText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
  userRole: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 1,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  }
};

// Custom logout modal styles - matching login page design
const logoutModalStyles = {
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginTop: 12,
    letterSpacing: -0.3,
  },
  modalMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontWeight: '400',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  logoutButton: {
    backgroundColor: '#0078d4',
    borderWidth: 1,
    borderColor: '#106ebe',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
};

export default Header;