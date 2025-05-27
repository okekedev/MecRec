// Simplified ReviewField.js for AI reasoning display
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Animated
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../styles';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const ReviewField = ({
  label,
  value,
  onValueChange,
  isReviewed,
  onReviewChange,
  aiReasoning,
  multiline = false
}) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const [expanded] = useState(new Animated.Value(0));
  
  // Toggle reasoning visibility with animation
  const toggleReasoning = () => {
    const toValue = showReasoning ? 0 : 1;
    
    Animated.timing(expanded, {
      toValue,
      duration: 300,
      useNativeDriver: false
    }).start();
    
    setShowReasoning(!showReasoning);
  };
  
  // Calculate animation height
  const maxHeight = expanded.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200]
  });
  
  // Get numbered label for field
  const getNumberedListLabel = () => {
    const fieldMapping = {
      'Patient Name': 1,
      'Date of Birth': 2,
      'Insurance Information': 3,
      'Location/Facility': 4,
      'Diagnosis (Dx)': 5,
      'Primary Care Provider (PCP)': 6,
      'Discharge (DC)': 7,
      'Wounds/Injuries': 8,
      'Medications & Antibiotics': 9,
      'Cardiac Medications/Drips': 10,
      'Labs & Vital Signs': 11,
      'Face-to-Face Evaluations': 12,
      'Medical History': 13,
      'Mental Health State': 14,
      'Additional Comments': 15
    };
    
    const number = fieldMapping[label];
    return number ? `${number}. ${label}` : label;
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.fieldCard}>
        {/* Header with field name and review toggle */}
        <View style={styles.headerRow}>
          <View style={styles.labelContainer}>
            <View style={[
              styles.statusIndicator,
              isReviewed ? styles.reviewedIndicator : styles.pendingIndicator
            ]} />
            <Text style={styles.label}>{getNumberedListLabel()}</Text>
          </View>
          <View style={styles.reviewToggle}>
            <Text style={[
              styles.reviewStatus,
              isReviewed ? styles.reviewedStatus : styles.pendingStatus
            ]}>
              {isReviewed ? 'Reviewed' : 'Pending'}
            </Text>
            <Switch
              value={isReviewed}
              onValueChange={onReviewChange}
              trackColor={{ false: '#eceef1', true: Colors.primaryLight }}
              thumbColor={isReviewed ? Colors.primary : '#9e9e9e'}
              ios_backgroundColor="#eceef1"
            />
          </View>
        </View>
        
        {/* Field value input */}
        <View style={[
          styles.inputContainer,
          isReviewed && styles.reviewedInputContainer
        ]}>
          <TextInput
            style={[
              styles.input,
              multiline && styles.multilineInput,
              isReviewed && styles.reviewedInput
            ]}
            value={value}
            onChangeText={onValueChange}
            placeholder="No information found"
            placeholderTextColor="#9e9e9e"
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
          />
        </View>
        
        {/* AI Reasoning section - simplified */}
        {aiReasoning && aiReasoning !== 'No reasoning provided' && (
          <View style={styles.reasoningContainer}>
            <TouchableOpacity
              style={styles.reasoningToggle}
              onPress={toggleReasoning}
            >
              <View style={styles.reasoningToggleContent}>
                <MaterialCommunityIcons 
                  name="brain" 
                  size={16} 
                  color={Colors.secondary} 
                  style={styles.reasoningIcon}
                />
                <Text style={styles.reasoningToggleText}>
                  {showReasoning ? 'Hide AI Reasoning' : 'Show AI Reasoning'}
                </Text>
                <View style={[
                  styles.toggleArrow,
                  showReasoning && styles.toggleArrowUp
                ]} />
              </View>
            </TouchableOpacity>
            
            <Animated.View 
              style={[
                styles.reasoningContentContainer,
                { maxHeight }
              ]}
            >
              <View style={styles.reasoningContent}>
                <Text style={styles.reasoningLabel}>AI Explanation:</Text>
                <View style={styles.reasoningTextBox}>
                  <Text style={styles.reasoningText}>
                    {aiReasoning}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.medium,
  },
  fieldCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: '#edf0f7',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: '#edf0f7',
    backgroundColor: '#f8fafc',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.small,
  },
  pendingIndicator: {
    backgroundColor: '#9e9e9e',
  },
  reviewedIndicator: {
    backgroundColor: Colors.success,
  },
  label: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    flex: 1,
  },
  reviewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewStatus: {
    fontSize: Typography.size.small,
    marginRight: Spacing.small,
  },
  reviewedStatus: {
    color: Colors.success,
    fontWeight: Typography.weight.medium,
  },
  pendingStatus: {
    color: '#9e9e9e',
  },
  inputContainer: {
    padding: Spacing.medium,
    backgroundColor: Colors.white,
  },
  reviewedInputContainer: {
    backgroundColor: Colors.white,
    borderLeftWidth: 2,
    borderLeftColor: Colors.success,
  },
  input: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    padding: Spacing.small,
    backgroundColor: '#f8fafc',
    borderRadius: BorderRadius.small,
    borderWidth: 1,
    borderColor: '#edf0f7',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reviewedInput: {
    backgroundColor: Colors.white,
    borderColor: '#edf0f7',
  },
  reasoningContainer: {
    borderTopWidth: 1,
    borderTopColor: '#edf0f7',
  },
  reasoningToggle: {
    padding: Spacing.medium,
    backgroundColor: '#f0f9ff',
  },
  reasoningToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasoningIcon: {
    marginRight: Spacing.small,
  },
  reasoningToggleText: {
    fontSize: Typography.size.small,
    color: Colors.secondary,
    fontWeight: Typography.weight.medium,
    flex: 1,
  },
  toggleArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderLeftColor: 'transparent',
    borderRightWidth: 5,
    borderRightColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 5,
    borderBottomColor: Colors.secondary,
  },
  toggleArrowUp: {
    transform: [{ rotate: '180deg' }],
  },
  reasoningContentContainer: {
    overflow: 'hidden',
  },
  reasoningContent: {
    padding: Spacing.medium,
    backgroundColor: Colors.secondaryLight,
  },
  reasoningLabel: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.semibold,
    color: Colors.secondary,
    marginBottom: Spacing.small,
  },
  reasoningTextBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.small,
    padding: Spacing.small,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  reasoningText: {
    fontSize: Typography.size.small,
    color: Colors.black,
    lineHeight: 20,
  },
});

export default ReviewField;