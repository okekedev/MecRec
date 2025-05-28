// src/components/ProgressOverlay.js - Optimized version with consolidated icon/color logic
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, CommonStyles } from '../styles';

const ProgressOverlay = ({ 
  visible,
  progress = 0,
  status = 'Processing...',
  currentStep = '',
  message = ''
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Animate in when visible changes
  useEffect(() => {
    if (visible) {
      // Fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
      
      // Start continuous rotation for the icon
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      
      // Start pulse animation
      startPulseAnimation();
    } else {
      // Fade out and scale down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);
  
  // Pulse animation function
  const startPulseAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (visible) {
        startPulseAnimation();
      }
    });
  };
  
  // CONSOLIDATED: Get step configuration (icon, colors) in one place
  const getStepConfig = () => {
    const step = currentStep.toLowerCase();
    
    // Define configurations for different step types
    const configs = {
      mapping: {
        icon: 'map-marker-outline',
        color: Colors.secondary,
        bgColor: Colors.secondaryLight,
      },
      ocr: {
        icon: 'text-recognition', 
        color: Colors.primary,
        bgColor: Colors.primaryLight,
      },
      ai: {
        icon: 'brain',
        color: Colors.primary, 
        bgColor: Colors.primaryLight,
      },
      list: {
        icon: 'format-list-numbered',
        color: Colors.primary,
        bgColor: Colors.primaryLight,
      },
      default: {
        icon: 'file-document-outline',
        color: Colors.primary,
        bgColor: Colors.primaryLight,
      }
    };
    
    // Determine which config to use based on step content
    if (step.includes('position') || step.includes('mapping') || step.includes('citation')) {
      return configs.mapping;
    } else if (step.includes('ocr') || step.includes('text')) {
      return configs.ocr;
    } else if (step.includes('ai') || step.includes('extract') || step.includes('analy') || step.includes('medical')) {
      return configs.ai;
    } else if (step.includes('list') || step.includes('numbered')) {
      return configs.list;
    }
    
    // Handle status-based colors
    switch (status) {
      case 'error': return { ...configs.default, color: Colors.accent, bgColor: Colors.accentLight };
      case 'warning': return { ...configs.default, color: Colors.warning, bgColor: '#fff8f0' };
      case 'complete': return { ...configs.default, color: Colors.success, bgColor: Colors.secondaryLight };
      default: return configs.default;
    }
  };
  
  // Calculate rotation for the spinner icon
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Calculate width of progress bar
  const progressWidth = `${Math.round(progress * 100)}%`;
  
  // Don't render anything if not visible
  if (!visible) return null;
  
  const stepConfig = getStepConfig();
  
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
    >
      <View style={CommonStyles.overlayBackdrop}>
        <Animated.View 
          style={[
            CommonStyles.overlayContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: -20 }
              ]
            }
          ]}
        >
          {/* Icon section with dynamic colors */}
          <Animated.View 
            style={[
              CommonStyles.overlayIconContainer,
              { 
                transform: [{ scale: pulseAnim }],
                backgroundColor: stepConfig.bgColor
              }
            ]}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <MaterialCommunityIcons 
                name={stepConfig.icon}
                size={40} 
                color={stepConfig.color}
              />
            </Animated.View>
          </Animated.View>
          
          {/* Status text with dynamic color */}
          <Text style={[
            CommonStyles.overlayTitle,
            { color: stepConfig.color }
          ]}>
            {currentStep || status}
          </Text>
          
          {/* Detailed message */}
          {message && (
            <Text style={CommonStyles.overlayMessage}>
              {message}
            </Text>
          )}
          
          {/* Progress bar with dynamic color */}
          <View style={CommonStyles.progressBarContainer}>
            <Animated.View 
              style={[
                CommonStyles.progressBar,
                { 
                  width: progressWidth,
                  backgroundColor: stepConfig.color
                }
              ]} 
            />
          </View>
          
          {/* Percentage text with dynamic color */}
          <Text style={[
            CommonStyles.progressPercentage,
            { color: stepConfig.color, marginBottom: 0 }
          ]}>
            {Math.round(progress * 100)}%
          </Text>
          
          {/* Additional info for source mapping steps */}
          {(currentStep.toLowerCase().includes('position') || 
            currentStep.toLowerCase().includes('mapping') || 
            currentStep.toLowerCase().includes('citation')) && (
            <Text style={styles.sourceMappingHint}>
              Preparing source highlighting for clinical review
            </Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

// Styles
const styles = {
  sourceMappingHint: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic'
  }
};

export default ProgressOverlay;