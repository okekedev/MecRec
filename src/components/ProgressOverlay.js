// src/components/ProgressOverlay.js - Fixed to stay open until AI analysis complete
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
  
  // ENHANCED: Internal state to control when to actually close
  const [shouldShow, setShouldShow] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  
  // Handle visibility logic - stay open until truly complete
  useEffect(() => {
    if (visible) {
      setShouldShow(true);
      setIsCompleting(false);
    } else if (status === 'complete' || status === 'error') {
      // Only start closing process when explicitly complete or error
      setIsCompleting(true);
      // Delay closing to show completion state
      setTimeout(() => {
        setShouldShow(false);
      }, 1500); // Show completion for 1.5 seconds
    }
    // Don't auto-close for any other reason
  }, [visible, status]);
  
  // Animate in when shouldShow changes
  useEffect(() => {
    if (shouldShow) {
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
      
      // Start continuous rotation for the icon (only if not completing)
      if (!isCompleting) {
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      }
      
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
  }, [shouldShow, isCompleting]);
  
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
      if (shouldShow && !isCompleting) {
        startPulseAnimation();
      }
    });
  };
  
  // ENHANCED: Better step configuration with proper completion detection
  const getStepConfig = () => {
    const step = currentStep.toLowerCase();
    
    // Define configurations for different step types
    const configs = {
      starting: {
        icon: 'rocket-launch-outline',
        color: Colors.primary,
        bgColor: Colors.primaryLight,
      },
      ocr: {
        icon: 'text-recognition', 
        color: Colors.primary,
        bgColor: Colors.primaryLight,
      },
      ai: {
        icon: 'brain',
        color: Colors.secondary, 
        bgColor: Colors.secondaryLight,
      },
      complete: {
        icon: 'check-circle',
        color: Colors.success,
        bgColor: '#e8f7ef',
      },
      error: {
        icon: 'alert-circle',
        color: Colors.accent,
        bgColor: Colors.accentLight,
      },
      warning: {
        icon: 'alert-outline',
        color: Colors.warning,
        bgColor: '#fff8f0',
      },
      default: {
        icon: 'file-document-outline',
        color: Colors.primary,
        bgColor: Colors.primaryLight,
      }
    };
    
    // Handle completion states first
    if (status === 'complete') {
      return configs.complete;
    } else if (status === 'error') {
      return configs.error;
    } else if (status === 'warning') {
      return configs.warning;
    }
    
    // ENHANCED: Better step detection based on content and progress
    if (step.includes('start') || step.includes('beginning') || progress < 0.15) {
      return configs.starting;
    } else if (step.includes('ocr') || step.includes('text') || step.includes('extract') || (progress >= 0.15 && progress < 0.4)) {
      return configs.ocr;
    } else if (step.includes('ai') || step.includes('medical') || step.includes('analy') || step.includes('brain') || progress >= 0.4) {
      return configs.ai;
    }
    
    return configs.default;
  };
  
  // ENHANCED: Better status messages based on progress
  const getDisplayMessage = () => {
    if (status === 'complete') return 'Processing Complete!';
    if (status === 'error') return 'Processing Error';
    if (status === 'warning') return 'Warning';
    
    // Custom messages based on progress and step
    if (progress >= 0.95) return 'Finalizing Results...';
    if (progress >= 0.85) return 'AI Analysis Complete';
    if (progress >= 0.4) return 'AI Analyzing Medical Information...';
    if (progress >= 0.3) return 'Text Extraction Complete';
    if (progress >= 0.15) return 'Processing Document with OCR...';
    if (progress >= 0.01) return 'Starting Document Processing...';
    
    return currentStep || status || 'Processing...';
  };
  
  // Calculate rotation for the spinner icon
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Calculate width of progress bar
  const progressWidth = `${Math.round(progress * 100)}%`;
  
  // Don't render anything if not visible
  if (!shouldShow) return null;
  
  const stepConfig = getStepConfig();
  const displayMessage = getDisplayMessage();
  
  return (
    <Modal
      transparent={true}
      visible={shouldShow}
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
            {/* Only rotate if still processing (not complete/error) */}
            <Animated.View style={{ 
              transform: (status === 'complete' || status === 'error') ? [] : [{ rotate: spin }]
            }}>
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
            {displayMessage}
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
          
          {/* ENHANCED: Phase-specific hints */}
          {progress < 0.3 && status !== 'complete' && status !== 'error' && (
            <Text style={styles.phaseHint}>
              Extracting text from document...
            </Text>
          )}
          
          {progress >= 0.3 && progress < 0.85 && status !== 'complete' && status !== 'error' && (
            <Text style={styles.phaseHint}>
              AI analyzing medical information...
            </Text>
          )}
          
          {progress >= 0.85 && progress < 1.0 && status !== 'complete' && status !== 'error' && (
            <Text style={styles.phaseHint}>
              Finalizing extraction results...
            </Text>
          )}
          
          {status === 'complete' && (
            <Text style={styles.completeHint}>
              Ready for clinical review
            </Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

// ENHANCED: Better styles
const styles = {
  phaseHint: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic'
  },
  completeHint: {
    fontSize: 12,
    color: Colors.success,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500'
  }
};

export default ProgressOverlay;