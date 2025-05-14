/**
 * Enhanced side menu component for MedRec application
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  BackHandler,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';

const { width } = Dimensions.get('window');
const MENU_WIDTH = Math.min(width * 0.75, 300);

const MenuItem = ({ label, icon, onPress, isActive = false }) => {
  return (
    <TouchableOpacity
      style={[styles.menuItem, isActive && styles.activeMenuItem]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemIcon}>{icon}</View>
      <Text
        style={[
          styles.menuItemLabel,
          isActive && styles.activeMenuItemLabel,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// Simple icon components for menu items
const HomeIcon = ({ color = Colors.black }) => (
  <View style={[styles.icon, { borderColor: color }]}>
    <View style={[styles.iconRoof, { borderBottomColor: color }]} />
    <View style={[styles.iconBase, { borderColor: color }]} />
  </View>
);

const DocumentIcon = ({ color = Colors.black }) => (
  <View style={[styles.icon, { borderColor: color }]}>
    <View style={[styles.iconPage, { borderColor: color }]} />
    <View style={[styles.iconFold, { borderColor: color }]} />
  </View>
);

const FolderIcon = ({ color = Colors.black }) => (
  <View style={[styles.icon, { borderColor: color }]}>
    <View style={[styles.iconFolder, { borderColor: color }]} />
    <View style={[styles.iconFolderTab, { borderColor: color }]} />
  </View>
);

const SettingsIcon = ({ color = Colors.black }) => (
  <View style={[styles.icon, { borderColor: color }]}>
    <View style={[styles.iconGear, { borderColor: color }]} />
    <View style={[styles.iconGearCenter, { backgroundColor: color }]} />
  </View>
);

const AppSideMenu = ({
  isVisible,
  onClose,
  currentScreen,
  userName = null,
  userRole = null,
}) => {
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Handle menu animation
  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -MENU_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, translateX, opacity]);

  // Handle back button on Android
  useEffect(() => {
    const handleBackButton = () => {
      if (isVisible) {
        onClose();
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [isVisible, onClose]);

  const navigateTo = (screen) => {
    onClose();
    setTimeout(() => navigation.navigate(screen), 300);
  };

  if (!isVisible && translateX._value === -MENU_WIDTH) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Dark overlay behind menu */}
      <Animated.View
        style={[styles.overlay, { opacity }]}
        pointerEvents={isVisible ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.overlayTouch}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Menu content */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            transform: [{ translateX }],
            ...Platform.select({
              ios: {
                shadowOpacity: isVisible ? 0.2 : 0,
              },
            }),
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* User profile section */}
          <View style={styles.userSection}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>
                {userName
                  ? userName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .substring(0, 2)
                  : 'MR'}
              </Text>
            </View>
            <Text style={styles.userName}>{userName || 'MedRec User'}</Text>
            {userRole && <Text style={styles.userRole}>{userRole}</Text>}
          </View>

          {/* Menu items */}
          <ScrollView
            style={styles.menuScrollView}
            showsVerticalScrollIndicator={false}
          >
            <MenuItem
              label="Dashboard"
              icon={<HomeIcon color={currentScreen === 'Home' ? Colors.primary : Colors.black} />}
              onPress={() => navigateTo('Home')}
              isActive={currentScreen === 'Home'}
            />
            <MenuItem
              label="Upload Document"
              icon={<DocumentIcon color={currentScreen === 'DocumentUpload' ? Colors.primary : Colors.black} />}
              onPress={() => navigateTo('DocumentUpload')}
              isActive={currentScreen === 'DocumentUpload'}
            />
            <MenuItem
              label="My Documents"
              icon={<FolderIcon color={currentScreen === 'DocumentList' ? Colors.primary : Colors.black} />}
              onPress={() => navigateTo('DocumentList')}
              isActive={currentScreen === 'DocumentList'}
            />
            <MenuItem
              label="Settings"
              icon={<SettingsIcon color={currentScreen === 'Settings' ? Colors.primary : Colors.black} />}
              onPress={() => navigateTo('Settings')}
              isActive={currentScreen === 'Settings'}
            />
          </ScrollView>

          {/* App version */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>MedRec v1.0.0</Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  overlayTouch: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: MENU_WIDTH,
    height: '100%',
    backgroundColor: Colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowRadius: 10,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0px 0px 15px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  userSection: {
    padding: Spacing.large,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    alignItems: 'center',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.medium,
  },
  userInitials: {
    fontSize: Typography.size.xlarge,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
  },
  userName: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    textAlign: 'center',
  },
  userRole: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginTop: Spacing.tiny,
    textAlign: 'center',
  },
  menuScrollView: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  activeMenuItem: {
    backgroundColor: Colors.primaryLight,
  },
  menuItemIcon: {
    width: 24,
    height: 24,
    marginRight: Spacing.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    fontWeight: Typography.weight.medium,
  },
  activeMenuItemLabel: {
    color: Colors.primary,
    fontWeight: Typography.weight.semibold,
  },
  versionContainer: {
    padding: Spacing.medium,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  versionText: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  
  // Icon styles
  icon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Home icon
  iconRoof: {
    width: 14,
    height: 0,
    borderBottomWidth: 7,
    borderBottomColor: 'currentColor',
    borderLeftWidth: 7,
    borderLeftColor: 'transparent',
    borderRightWidth: 7,
    borderRightColor: 'transparent',
    position: 'absolute',
    top: 0,
  },
  iconBase: {
    width: 12,
    height: 10,
    borderWidth: 1,
    borderColor: 'currentColor',
    position: 'absolute',
    bottom: 2,
  },
  // Document icon
  iconPage: {
    width: 14,
    height: 16,
    borderWidth: 1,
    borderColor: 'currentColor',
  },
  iconFold: {
    width: 5,
    height: 5,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'currentColor',
    position: 'absolute',
    top: 0,
    right: 3,
  },
  // Folder icon
  iconFolder: {
    width: 16,
    height: 12,
    borderWidth: 1,
    borderColor: 'currentColor',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconFolderTab: {
    width: 6,
    height: 3,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: 'currentColor',
    position: 'absolute',
    top: 0,
    left: 3,
  },
  // Settings icon
  iconGear: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'currentColor',
    borderStyle: 'dashed',
  },
  iconGearCenter: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'currentColor',
    position: 'absolute',
  },
});

export default AppSideMenu;