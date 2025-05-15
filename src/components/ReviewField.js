// src/components/ReviewField.js (Updated for numbered list approach)
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

const ReviewField = ({
  label,
  value,
  onValueChange,
  isReviewed,
  onReviewChange,
  sourceText,
  sourceType,
  multiline = false
}) => {
  const [showSource, setShowSource] = useState(false);
  const [expanded] = useState(new Animated.Value(0));
  
  // Toggle source visibility with animation
  const toggleSource = () => {
    const toValue = showSource ? 0 : 1;
    
    Animated.timing(expanded, {
      toValue,
      duration: 300,
      useNativeDriver: false
    }).start();
    
    setShowSource(!showSource);
  };
  
  // Calculate animation height
  const maxHeight = expanded.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200]
  });
  
  // Map field label to a numbered list format label for consistent reference
  const getNumberedListLabel = () => {
    // Create a mapping from field names to their position in the numbered list
    const fieldMapping = {
      'Patient Name': 1,
      'Date of Birth': 2,
      'Insurance': 3,
      'Location': 4,
      'Diagnosis (Dx)': 5,
      'Primary Care Provider (PCP)': 6,
      'Discharge (DC)': 7,
      'Wounds': 8,
      'Antibiotics': 9,
      'Cardiac Medications': 10,
      'Labs': 11,
      'Face to Face': 12,
      'Medical History': 13,
      'Mental Health State': 14,
      'Additional Comments': 15
    };
    
    // Return the numbered label if found, otherwise use the original label
    const number = fieldMapping[label];
    return number ? `${number}. ${label}` : label;
  };
  
  return (
    <View style={modernStyles.container}>
      <View style={modernStyles.fieldCard}>
        <View style={modernStyles.headerRow}>
          <View style={modernStyles.labelContainer}>
            <View style={[
              modernStyles.statusIndicator,
              isReviewed ? modernStyles.reviewedIndicator : modernStyles.pendingIndicator
            ]} />
            <Text style={modernStyles.label}>{getNumberedListLabel()}</Text>
          </View>
          <View style={modernStyles.reviewToggle}>
            <Text style={[
              modernStyles.reviewStatus,
              isReviewed ? modernStyles.reviewedStatus : modernStyles.pendingStatus
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
          modernStyles.inputContainer,
          isReviewed && modernStyles.reviewedInputContainer
        ]}>
          <TextInput
            style={[
              modernStyles.input,
              multiline && modernStyles.multilineInput,
              isReviewed && modernStyles.reviewedInput
            ]}
            value={value}
            onChangeText={onValueChange}
            placeholder="No information found"
            placeholderTextColor="#9e9e9e"
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
          />
        </View>
        
        {/* Source reference section */}
        {sourceText && (
          <View style={modernStyles.sourceContainer}>
            <TouchableOpacity
              style={modernStyles.sourceToggle}
              onPress={toggleSource}
            >
              <Text style={modernStyles.sourceToggleText}>
                {showSource ? 'Hide Source Context' : 'Show Source Context'}
              </Text>
              <View style={[
                modernStyles.toggleArrow,
                showSource && modernStyles.toggleArrowUp
              ]} />
            </TouchableOpacity>
            
            <Animated.View 
              style={[
                modernStyles.sourceContentContainer,
                { maxHeight }
              ]}
            >
              <View style={modernStyles.sourceContent}>
                {sourceType && (
                  <Text style={modernStyles.sourceType}>
                    Found in: {sourceType}
                  </Text>
                )}
                <Text style={modernStyles.sourceText}>
                  {sourceText}
                </Text>
              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
};

const modernStyles = StyleSheet.create({
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
  sourceContainer: {
    borderTopWidth: 1,
    borderTopColor: '#edf0f7',
  },
  sourceToggle: {
    padding: Spacing.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
  },
  sourceToggleText: {
    fontSize: Typography.size.small,
    color: Colors.primary,
    fontWeight: Typography.weight.medium,
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
    borderBottomColor: Colors.primary,
  },
  toggleArrowUp: {
    transform: [{ rotate: '180deg' }],
  },
  sourceContentContainer: {
    overflow: 'hidden',
  },
  sourceContent: {
    padding: Spacing.medium,
    backgroundColor: Colors.primaryLight,
  },
  sourceType: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.tiny,
  },
  sourceText: {
    fontSize: Typography.size.small,
    color: Colors.black,
    lineHeight: 20,
  },
});

export default ReviewField;