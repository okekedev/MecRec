/**
 * ProgressOverlay.js - Modern animated progress indicator for document processing
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../styles';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ProgressOverlay = ({ 
  visible,
  progress = 0,
  status = 'Processing...',
  showDetails = false,
  currentStep = '',
  totalSteps = 0,
  currentStepProgress = 0
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Animate in when visible changes
  useEffect(() => {
    if (visible) {
      // Reset animations
      progressAnim.setValue(0);
      
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
  
  // Update progress animation when progress changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);
  
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
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });
  
  // Don't render anything if not visible
  if (!visible) return null;
  
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: -20 } // Slight upward offset
              ]
            }
          ]}
        >
          {/* Icon section */}
          <Animated.View 
            style={[
              styles.iconContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <MaterialCommunityIcons 
                name="file-document-outline" 
                size={40} 
                color={Colors.primary} 
              />
            </Animated.View>
          </Animated.View>
          
          {/* Status text */}
          <Text style={styles.statusText}>{status}</Text>
          
          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[
                styles.progressBar,
                { width: progressWidth }
              ]} 
            />
          </View>
          
          {/* Percentage text */}
          <Text style={styles.percentageText}>{Math.round(progress * 100)}%</Text>
          
          {/* Optional details */}
          {showDetails && currentStep && (
            <View style={styles.detailsContainer}>
              <Text style={styles.stepText}>
                {currentStep} {totalSteps > 0 ? `(${Math.round(currentStepProgress * 100)}%)` : ''}
              </Text>
              {totalSteps > 0 && (
                <Text style={styles.stepsText}>
                  Step {Math.ceil(progress * totalSteps)} of {totalSteps}
                </Text>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  statusText: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.medium,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.small,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  percentageText: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.medium,
  },
  detailsContainer: {
    width: '100%',
    padding: Spacing.small,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.small,
  },
  stepText: {
    fontSize: Typography.size.small,
    color: Colors.black,
    textAlign: 'center',
    marginBottom: 2,
  },
  stepsText: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    textAlign: 'center',
  }
});

export default ProgressOverlay;