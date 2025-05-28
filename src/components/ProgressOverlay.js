// src/components/ProgressOverlay.js - Add progress steps for source mapping
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
  
  // Calculate rotation for the spinner icon
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Calculate width of progress bar
  const progressWidth = `${Math.round(progress * 100)}%`;
  
  // UPDATED: Get the appropriate icon based on the current step
  const getIcon = () => {
    const step = currentStep.toLowerCase();
    
    // NEW: Handle source mapping steps
    if (step.includes('position') || step.includes('mapping')) {
      return 'map-marker-outline';
    } else if (step.includes('ocr') || step.includes('text')) {
      return 'text-recognition';
    } else if (step.includes('ai') || step.includes('extract') || step.includes('analy') || step.includes('medical')) {
      return 'brain';
    } else if (step.includes('list') || step.includes('numbered')) {
      return 'format-list-numbered';
    } else if (step.includes('citation') || step.includes('source')) {
      return 'map-marker-radius';
    } else {
      return 'file-document-outline';
    }
  };
  
  // UPDATED: Get status color with new steps
  const getStatusColor = () => {
    const step = currentStep.toLowerCase();
    
    // NEW: Color coding for different steps
    if (step.includes('position') || step.includes('mapping') || step.includes('citation')) {
      return Colors.secondary; // Green for source mapping
    } else if (step.includes('ai') || step.includes('medical')) {
      return Colors.primary; // Blue for AI processing
    } else {
      switch (status) {
        case 'error': return Colors.accent;
        case 'warning': return Colors.warning;
        case 'complete': return Colors.success;
        default: return Colors.primary;
      }
    }
  };
  
  // UPDATED: Get background color for icon
  const getIconBackgroundColor = () => {
    const step = currentStep.toLowerCase();
    
    if (step.includes('position') || step.includes('mapping') || step.includes('citation')) {
      return Colors.secondaryLight;
    } else if (step.includes('ai') || step.includes('medical')) {
      return Colors.primaryLight;
    } else {
      return Colors.primaryLight;
    }
  };
  
  // Don't render anything if not visible
  if (!visible) return null;
  
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
                backgroundColor: getIconBackgroundColor()
              }
            ]}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <MaterialCommunityIcons 
                name={getIcon()}
                size={40} 
                color={getStatusColor()}
              />
            </Animated.View>
          </Animated.View>
          
          {/* Status text with dynamic color */}
          <Text style={[
            CommonStyles.overlayTitle,
            { color: getStatusColor() }
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
                  backgroundColor: getStatusColor()
                }
              ]} 
            />
          </View>
          
          {/* Percentage text with dynamic color */}
          <Text style={[
            CommonStyles.progressPercentage,
            { color: getStatusColor(), marginBottom: 0 }
          ]}>
            {Math.round(progress * 100)}%
          </Text>
          
          {/* NEW: Additional info for source mapping steps */}
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

// NEW: Additional styles
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