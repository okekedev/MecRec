/**
 * Header.js - Modern clinical header component with logo positioning
 */
import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  SafeAreaView,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
          {rightComponent}
        </View>
      </View>
      
      {/* Modern line indicator */}
      {elevated && (
        <View style={CommonStyles.headerIndicator}>
          <View style={CommonStyles.headerIndicatorInner} />
        </View>
      )}
    </SafeAreaView>
  );
};

export default Header;