/**
 * Header.js - Modern clinical header component with logout button
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
    console.log('🔴 LOGOUT BUTTON CLICKED!');
    console.log('🔍 useUser context:', { user: !!user, onLogout: !!onLogout });
    
    // Show custom modal instead of Alert.alert
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    console.log('🔒 User confirmed logout');
    setShowLogoutModal(false);
    
    try {
      // Try context logout first
      if (onLogout) {
        console.log('📱 Using context onLogout...');
        await onLogout();
      } else {
        console.log('⚠️ No context onLogout, using direct MicrosoftAuth...');
        await microsoftAuth.manualLogout();
      }
      
      console.log('✅ Logout process completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const handleCancelLogout = () => {
    console.log('❌ User cancelled logout');
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
              style={CommonStyles.headerLogoButton}
              onPress={handleMenuPress}
              accessibilityLabel="Menu"
              accessibilityRole="button"
            >
              <Image 
                source={require('../assets/medreclogo.png')} 
                style={CommonStyles.headerLogoImage}
                resizeMode="contain"
              />
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
                size={28} // Slightly smaller like login icons
                color="#0078d4" // Microsoft blue to match login
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker backdrop like login
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32, // More padding like login card
    width: '100%',
    maxWidth: 420, // Slightly wider like login
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12, // Stronger shadow like login
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9', // Subtle border like login
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24, // More spacing like login
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600', // Match login weight
    color: '#1a202c', // Darker color like login
    marginTop: 12,
    letterSpacing: -0.3, // Subtle letter spacing like login
  },
  modalMessage: {
    fontSize: 15, // Match login description size
    color: '#64748b', // Match login gray
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32, // More spacing like login
    fontWeight: '400',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14, // Match login button padding
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
    borderColor: '#d1d5db', // Professional gray border
  },
  logoutButton: {
    backgroundColor: '#0078d4', // Microsoft blue like login
    borderWidth: 1,
    borderColor: '#106ebe', // Darker blue border like login
  },
  cancelButtonText: {
    color: '#374151', // Professional dark gray
    fontSize: 15, // Match login button size
    fontWeight: '600',
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: 15, // Match login button size
    fontWeight: '600',
  },
};

export default Header;