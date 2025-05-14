/**
 * Enhanced Header component with enterprise styling using global styles
 */
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  StatusBar,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Shadows, ZIndex } from '../styles';

const EnhancedHeader = ({
  title = 'MedRec',
  showBackButton = false,
  rightComponent = null,
  onMenuPress = null,
  backgroundColor = Colors.white,
  textColor = Colors.black,
  elevated = true,
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
          ) : (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleMenuPress}
              accessibilityLabel="Menu"
              accessibilityRole="button"
            >
              <View style={styles.menuIcon}>
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
              </View>
            </TouchableOpacity>
          )}
          
          <Text 
            style={[
              styles.title, 
              { color: textColor }
            ]} 
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        
        <View style={styles.rightSection}>
          {rightComponent}
        </View>
      </View>
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
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.small,
  },
  title: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    flex: 1,
  },
  menuIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: Colors.black,
    marginVertical: 2,
    borderRadius: BorderRadius.small,
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
});

export default EnhancedHeader;