/**
 * EnhancedHeader.js - Modern clinical header component with improved logo positioning
 */
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  StatusBar,
  SafeAreaView,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Shadows, ZIndex } from '../styles';

const EnhancedHeader = ({
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

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    }
  };

  return (
    <SafeAreaView 
      style={[
        styles.safeArea, 
        { backgroundColor },
        elevated && styles.elevated
      ]}
    >
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={backgroundColor} 
      />
      <View style={styles.container}>
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleBackPress}
              accessibilityLabel="Back"
              accessibilityRole="button"
            >
              <View style={styles.backIcon}>
                <View style={styles.backArrow} />
              </View>
            </TouchableOpacity>
          ) : showLogo ? (
            <TouchableOpacity
              style={styles.logoButton}
              onPress={handleMenuPress}
              accessibilityLabel="Menu"
              accessibilityRole="button"
            >
              <Image 
                source={require('../assets/medreclogo.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : null}
          
          {title ? (
            <Text 
              style={[
                styles.title, 
                { color: textColor }
              ]} 
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
        </View>
        
        <View style={styles.rightSection}>
          {rightComponent}
        </View>
      </View>
      
      {/* Modern line indicator */}
      {elevated && (
        <View style={styles.headerIndicator}>
          <View style={styles.headerIndicatorInner} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    width: '100%',
    zIndex: ZIndex.header,
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.large,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.medium,
  },
  logoButton: {
    height: 40,
    width: 100, // Adjusted width for logo
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: Spacing.medium,
  },
  title: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    flex: 1,
  },
  logoImage: {
    height: 90,
    width: 90, // Adjusted width for proper aspect ratio
  },
  backIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.black,
    transform: [{ rotate: '45deg' }, { translateX: 2 }],
  },
  headerIndicator: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  headerIndicatorInner: {
    width: 40,
    height: 3,
    backgroundColor: Colors.primaryLight,
    borderRadius: 2,
  },
});

export default EnhancedHeader;