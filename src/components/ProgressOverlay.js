/**
 * ProgressOverlay.js - Modern animated progress indicator for document processing
 * Enhanced with AI analysis status
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
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const ProgressOverlay = ({ 
  visible,
  progress = 0,
  status = 'Processing...',
  currentStep = '',
  message = '',
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
  
  // Get the appropriate icon based on the current step
  const renderIcon = () => {
    const isOCR = currentStep.toLowerCase().includes('ocr') || currentStep.toLowerCase().includes('text');
    const isAI = currentStep.toLowerCase().includes('ai') || currentStep.toLowerCase().includes('extract') || currentStep.toLowerCase().includes('analy');
    
    if (isOCR) {
      return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <MaterialCommunityIcons 
            name="text-recognition" 
            size={40} 
            color={Colors.primary} 
          />
        </Animated.View>
      );
    } else if (isAI) {
      return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <MaterialCommunityIcons 
            name="brain" 
            size={40} 
            color={Colors.secondary} 
          />
        </Animated.View>
      );
    } else {
      return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <MaterialCommunityIcons 
            name="file-document-outline" 
            size={40} 
            color={Colors.primary} 
          />
        </Animated.View>
      );
    }
  };
  
  // Get status color based on status
  const getStatusColor = () => {
    if (status === 'error') {
      return Colors.accent;
    } else if (status === 'warning') {
      return Colors.warning;
    } else if (status === 'complete') {
      return Colors.success;
    } else {
      return Colors.primary;
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
              { 
                transform: [{ scale: pulseAnim }],
                backgroundColor: currentStep.toLowerCase().includes('ai') ? 
                  Colors.secondaryLight : 
                  Colors.primaryLight
              }
            ]}
          >
            {renderIcon()}
          </Animated.View>
          
          {/* Status text */}
          <Text style={[
            styles.statusText,
            { color: getStatusColor() }
          ]}>
            {currentStep || status}
          </Text>
          
          {/* Detailed message */}
          {message && (
            <Text style={styles.messageText}>
              {message}
            </Text>
          )}
          
          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[
                styles.progressBar,
                { 
                  width: progressWidth,
                  backgroundColor: getStatusColor()
                }
              ]} 
            />
          </View>
          
          {/* Percentage text */}
          <Text style={styles.percentageText}>{Math.round(progress * 100)}%</Text>
          
          {/* Processing stage indicator */}
          <View style={styles.stagesContainer}>
            <View style={[
              styles.stage, 
              progress >= 0.1 ? styles.completedStage : styles.pendingStage
            ]}>
              <MaterialCommunityIcons 
                name="file-document-outline" 
                size={16} 
                color={progress >= 0.1 ? Colors.white : Colors.gray} 
              />
            </View>
            <View style={styles.stageLine} />
            <View style={[
              styles.stage, 
              progress >= 0.3 ? styles.completedStage : styles.pendingStage
            ]}>
              <MaterialCommunityIcons 
                name="text-recognition" 
                size={16} 
                color={progress >= 0.3 ? Colors.white : Colors.gray} 
              />
            </View>
            <View style={styles.stageLine} />
            <View style={[
              styles.stage, 
              progress >= 0.6 ? styles.completedStage : styles.pendingStage,
              currentStep.toLowerCase().includes('ai') ? styles.activeStage : null
            ]}>
              <MaterialCommunityIcons 
                name="brain" 
                size={16} 
                color={progress >= 0.6 ? Colors.white : Colors.gray} 
              />
            </View>
            <View style={styles.stageLine} />
            <View style={[
              styles.stage, 
              progress >= 0.9 ? styles.completedStage : styles.pendingStage
            ]}>
              <MaterialCommunityIcons 
                name="check-circle-outline" 
                size={16} 
                color={progress >= 0.9 ? Colors.white : Colors.gray} 
              />
            </View>
          </View>
          
          {/* Stage labels */}
          <View style={styles.stageLabelsContainer}>
            <Text style={[
              styles.stageLabel, 
              progress >= 0.1 ? styles.activeStageLabel : styles.inactiveStageLabel
            ]}>
              Start
            </Text>
            <Text style={[
              styles.stageLabel, 
              progress >= 0.3 ? styles.activeStageLabel : styles.inactiveStageLabel
            ]}>
              OCR
            </Text>
            <Text style={[
              styles.stageLabel, 
              progress >= 0.6 ? styles.activeStageLabel : styles.inactiveStageLabel
            ]}>
              AI
            </Text>
            <Text style={[
              styles.stageLabel, 
              progress >= 0.9 ? styles.activeStageLabel : styles.inactiveStageLabel
            ]}>
              Done
            </Text>
          </View>
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
    maxWidth: 350,
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
    marginBottom: Spacing.small,
    textAlign: 'center',
  },
  messageText: {
    fontSize: Typography.size.small,
    color: Colors.gray,
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
  stagesContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.small,
  },
  stage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
  },
  completedStage: {
    backgroundColor: Colors.primary,
  },
  pendingStage: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeStage: {
    backgroundColor: Colors.secondary,
  },
  stageLabelsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  stageLabel: {
    fontSize: Typography.size.tiny,
    textAlign: 'center',
    width: 40,
  },
  activeStageLabel: {
    color: Colors.black,
    fontWeight: Typography.weight.medium,
  },
  inactiveStageLabel: {
    color: Colors.gray,
  }
});

export default ProgressOverlay;