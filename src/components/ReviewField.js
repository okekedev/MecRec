// ReviewField.js - Now using MedicalFieldService and global CommonStyles
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
  
  // Get service instance
  const medicalFieldService = MedicalFieldService.getInstance();
  
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
  
  // Determine if field needs multiline input
  const isMultiline = ['history', 'mentalHealthState', 'additionalComments', 'labsAndVitals', 'wounds', 'medications'].includes(fieldKey);
  
  // Get numbered label from service
  const numberedLabel = medicalFieldService.getNumberedLabel(fieldKey);
  
  return (
    <View style={CommonStyles.reviewFieldContainer}>
      <View style={CommonStyles.reviewFieldCard}>
        {/* Header with field name and review toggle */}
        <View style={CommonStyles.reviewFieldHeaderRow}>
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
              trackColor={{ false: Colors.reviewBorder, true: Colors.primaryLight }}
              thumbColor={isReviewed ? Colors.primary : Colors.gray}
              ios_backgroundColor={Colors.reviewBorder}
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
              isMultiline && CommonStyles.multilineInput,
              isReviewed && CommonStyles.reviewFieldReviewedInput
            ]}
            value={value}
            onChangeText={onValueChange}
            placeholder="No information found"
            placeholderTextColor={Colors.gray}
            multiline={isMultiline}
            numberOfLines={isMultiline ? 3 : 1}
            textAlignVertical={isMultiline ? 'top' : 'center'}
          />
        </View>
        
        {/* AI Reasoning section */}
        {aiReasoning && aiReasoning !== 'No reasoning provided' && (
          <View style={CommonStyles.reviewFieldReasoningContainer}>
            <TouchableOpacity
              style={CommonStyles.reviewFieldReasoningToggle}
              onPress={toggleReasoning}
              activeOpacity={0.7}
            >
              <View style={CommonStyles.reviewFieldReasoningToggleContent}>
                <MaterialCommunityIcons 
                  name="brain" 
                  size={16} 
                  color={Colors.secondary} 
                  style={CommonStyles.reviewFieldReasoningIcon}
                />
                <Text style={CommonStyles.reviewFieldReasoningToggleText}>
                  {showReasoning ? 'Hide AI Reasoning' : 'Show AI Reasoning'}
                </Text>
                <MaterialCommunityIcons
                  name={showReasoning ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={Colors.secondary}
                />
              </View>
            </TouchableOpacity>
            
            <Animated.View 
              style={[
                CommonStyles.reviewFieldReasoningContentContainer,
                { maxHeight }
              ]}
            >
              <View style={CommonStyles.reviewFieldReasoningContent}>
                <Text style={CommonStyles.reviewFieldReasoningLabel}>AI Explanation:</Text>
                <View style={CommonStyles.reviewFieldReasoningTextBox}>
                  <Text style={CommonStyles.reviewFieldReasoningText}>
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