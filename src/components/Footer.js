/**
 * Footer.js - Simple footer component for MedRec app
 */
import React from 'react';
import { 
  View, 
  Text, 
  Image,
  Platform 
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../styles';

const Footer = ({
  backgroundColor = Colors.white,
  textColor = Colors.gray,
  style = {}
}) => {
  
  return (
    <View style={[styles.footerContainer, { backgroundColor }, style]}>
      <View style={styles.footerContent}>
        {/* Center the copyright text */}
        <Text style={[styles.copyrightText, { color: textColor }]}>
          © {new Date().getFullYear()} Christian Okeke • MedRec v1.0.0 • For healthcare professional use only
        </Text>
        
        {/* Logo in bottom right */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/medreclogo.png')} 
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
};

const styles = {
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: Spacing.small,
    paddingHorizontal: Spacing.medium,
    minHeight: 60,
    justifyContent: 'center',
  },
  
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the content
    position: 'relative', // Allow absolute positioning of logo
  },
  
  copyrightText: {
    fontSize: Typography.size.tiny,
    textAlign: 'center',
    flex: 1, // Take up available space for centering
  },
  
  logoContainer: {
    position: 'absolute',
    right: 0,
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  footerLogo: {
    width: '100%',
    height: '100%',
    opacity: 0.7, // Subtle opacity so it doesn't compete with text
  },
};

export default Footer;