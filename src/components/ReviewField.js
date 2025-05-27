// Updated ReviewField.js - Using consolidated styles
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Animated
} from 'react-native';
import { Colors, CommonStyles } from '../styles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MedicalFieldService from '../services/MedicalFieldService';

const ReviewField = ({
  fieldKey,
  value,
  onValueChange,
  isReviewed,
  onReviewChange,
  aiReasoning
}) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const [expanded] = useState(new Animated.Value(0));
  
  const medicalFieldService = MedicalFieldService.getInstance();
  
  // Get field metadata from service
  const fieldDefinition = medicalFieldService.getFieldByKey(fieldKey);
  
  if (!fieldDefinition) {
    console.warn(`Unknown field key: ${fieldKey}`);
    return null;
  }
  
  // Get the numbered label from service
  const numberedLabel = medicalFieldService.getNumberedLabel(fieldKey);
  
  // UI logic: determine if this field should be multiline based on the field type
  const isMultiline = [
    'history', 
    'mentalHealthState', 
    'additionalComments',
    'labsAndVitals',
    'wounds',
    'medications',
    'cardiacDrips'
  ].includes(fieldKey);
  
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
  
  return (
    <View style={CommonStyles.reviewFieldContainer}>
      <View style={CommonStyles.reviewFieldCard}>
        {/* Header with field name and review toggle */}
        <View style={CommonStyles.reviewFieldHeader}>
          <View style={CommonStyles.reviewFieldLabelContainer}>
            <View style={[
              CommonStyles.reviewFieldStatusIndicator,
              isReviewed ? CommonStyles.reviewFieldReviewedIndicator : CommonStyles.reviewFieldPendingIndicator
            ]} />
            <Text style={CommonStyles.reviewFieldLabel}>{numberedLabel}</Text>
          </View>
          <View style={CommonStyles.reviewFieldToggle}>
            <Text style={[
              CommonStyles.reviewFieldStatus,
              isReviewed ? CommonStyles.reviewFieldReviewedStatus : CommonStyles.reviewFieldPendingStatus
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
          CommonStyles.reviewFieldInputContainer,
          isReviewed && CommonStyles.reviewFieldReviewedInputContainer
        ]}>
          <TextInput
            style={[
              CommonStyles.reviewFieldInput,
              isMultiline && CommonStyles.reviewFieldMultilineInput,
              isReviewed && CommonStyles.reviewFieldReviewedInput
            ]}
            value={value}
            onChangeText={onValueChange}
            placeholder={`No ${fieldDefinition.label.toLowerCase()} found`}
            placeholderTextColor="#9e9e9e"
            multiline={isMultiline}
            numberOfLines={isMultiline ? 3 : 1}
          />
        </View>
        
        {/* AI Reasoning section */}
        {aiReasoning && aiReasoning !== 'No reasoning provided' && (
          <View style={CommonStyles.aiReasoningContainer}>
            <TouchableOpacity
              style={CommonStyles.aiReasoningToggle}
              onPress={toggleReasoning}
            >
              <View style={CommonStyles.aiReasoningToggleContent}>
                <MaterialCommunityIcons 
                  name="brain" 
                  size={16} 
                  color={Colors.secondary} 
                  style={CommonStyles.aiReasoningIcon}
                />
                <Text style={CommonStyles.aiReasoningToggleText}>
                  {showReasoning ? 'Hide AI Reasoning' : 'Show AI Reasoning'}
                </Text>
                <View style={[
                  CommonStyles.aiReasoningArrow,
                  showReasoning && CommonStyles.aiReasoningArrowUp
                ]} />
              </View>
            </TouchableOpacity>
            
            <Animated.View 
              style={[
                CommonStyles.aiReasoningContentContainer,
                { maxHeight }
              ]}
            >
              <View style={CommonStyles.aiReasoningContent}>
                <Text style={CommonStyles.aiReasoningLabel}>AI Explanation:</Text>
                <View style={CommonStyles.aiReasoningTextBox}>
                  <Text style={CommonStyles.aiReasoningText}>
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

export default ReviewField;