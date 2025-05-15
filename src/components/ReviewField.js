/**
 * Enhanced ReviewField component with better context display
 * Includes human reasoning and coherent context
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Animated,
  ScrollView,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const ReviewField = ({
  label,
  value,
  onValueChange,
  isReviewed,
  onReviewChange,
  sourceContext, // Enhanced context object from embedding service
  multiline = false
}) => {
  const [showSource, setShowSource] = useState(false);
  const [expanded] = useState(new Animated.Value(0));
  
  // Calculate animation height - dynamic based on content
  const maxHeight = expanded.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 400] // Allow more space for better context display
  });
  
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
  
  // Format context data for display
  const formatContextData = () => {
    if (!sourceContext) {
      return {
        text: 'No source context available for this field.',
        explanation: 'This information could not be traced to a specific location in the document.',
        confidence: 0,
        sectionType: 'Unknown'
      };
    }
    
    // Use provided context data
    return {
      text: sourceContext.text || 'No specific text available.',
      explanation: sourceContext.explanation || 'No explanation provided.',
      confidence: sourceContext.confidence || 0,
      sectionType: sourceContext.sectionType || 'Unknown Section'
    };
  };
  
  // Get formatted context data
  const contextData = formatContextData();
  
  // Get confidence level styling
  const getConfidenceStyle = () => {
    const confidence = contextData.confidence;
    
    if (confidence >= 0.8) {
      return {
        label: 'High Confidence',
        color: Colors.success,
        icon: 'check-circle'
      };
    } else if (confidence >= 0.6) {
      return {
        label: 'Good Confidence',
        color: Colors.info,
        icon: 'info'
      };
    } else if (confidence >= 0.4) {
      return {
        label: 'Moderate Confidence',
        color: Colors.warning,
        icon: 'warning'
      };
    } else {
      return {
        label: 'Low Confidence',
        color: Colors.accent,
        icon: 'error'
      };
    }
  };
  
  // Get confidence display
  const confidenceStyle = getConfidenceStyle();
  
  // Highlight matched value in context text
  const highlightValueInContext = (text, valueToHighlight) => {
    if (!text || !valueToHighlight || !valueToHighlight.trim()) {
      return text;
    }
    
    // Split the text at the value to highlight
    const parts = text.split(new RegExp(`(${valueToHighlight})`, 'gi'));
    
    // Return array of text and highlighted elements
    return parts.map((part, index) => {
      if (part.toLowerCase() === valueToHighlight.toLowerCase()) {
        return (
          <Text key={index} style={styles.highlightedText}>
            {part}
          </Text>
        );
      }
      return part;
    });
  };
  
  // Map field label to a numbered format for consistent reference
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
    <View style={styles.container}>
      <View style={styles.fieldCard}>
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
            accessibilityLabel={`${label} input field`}
          />
        </View>
        
        {/* Enhanced source reference section */}
        <View style={styles.sourceContainer}>
          <TouchableOpacity
            style={styles.sourceToggle}
            onPress={toggleSource}
            accessibilityLabel={showSource ? "Hide source context" : "Show source context"}
            accessibilityRole="button"
          >
            <View style={styles.sourceToggleContent}>
              <Text style={styles.sourceToggleText}>
                {showSource ? 'Hide Source Context' : 'Show Source Context'}
              </Text>
              
              {/* Add confidence indicator */}
              <View style={styles.confidenceContainer}>
                <MaterialIcons 
                  name={confidenceStyle.icon} 
                  size={14} 
                  color={confidenceStyle.color} 
                  style={styles.confidenceIcon}
                />
                <Text style={[
                  styles.confidenceText,
                  { color: confidenceStyle.color }
                ]}>
                  {confidenceStyle.label}
                </Text>
              </View>
            </View>
            
            <View style={[
              styles.toggleArrow,
              showSource && styles.toggleArrowUp
            ]} />
          </TouchableOpacity>
          
          <Animated.View style={[styles.sourceContentContainer, { maxHeight }]}>
            <ScrollView style={styles.sourceContentScroll}>
              <View style={styles.sourceContent}>
                {/* Section type indicator */}
                <View style={styles.sectionTypeContainer}>
                  <MaterialCommunityIcons 
                    name="file-document-outline" 
                    size={16} 
                    color={Colors.primary}
                  />
                  <Text style={styles.sectionType}>
                    {contextData.sectionType}
                  </Text>
                </View>
                
                {/* Context explanation */}
                <View style={styles.explanationContainer}>
                  <Text style={styles.explanationText}>
                    {contextData.explanation}
                  </Text>
                </View>
                
                {/* Context text with highlighted value */}
                <View style={styles.contextTextContainer}>
                  <Text style={styles.contextText}>
                    {highlightValueInContext(contextData.text, value)}
                  </Text>
                </View>
                
                {/* Verification prompt */}
                <View style={[
                  styles.verificationPrompt,
                  { borderLeftColor: confidenceStyle.color }
                ]}>
                  <Text style={[
                    styles.verificationText,
                    { color: confidenceStyle.color }
                  ]}>
                    Does this source support the extracted information? {confidenceStyle.confidence < 0.6 ? "Please verify carefully." : ""}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
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
    ...Shadows.soft,
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
  sourceToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceToggleText: {
    fontSize: Typography.size.small,
    color: Colors.primary,
    fontWeight: Typography.weight.medium,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.medium,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.small,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
    ...Shadows.soft,
  },
  confidenceIcon: {
    marginRight: 4,
  },
  confidenceText: {
    fontSize: Typography.size.tiny,
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
  sourceContentScroll: {
    maxHeight: 380, // Allow scrolling for very long contexts
  },
  sourceContent: {
    padding: Spacing.medium,
    backgroundColor: Colors.primaryLight,
  },
  sectionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.small,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
    alignSelf: 'flex-start',
    marginBottom: Spacing.small,
    ...Shadows.soft,
  },
  sectionType: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary,
    marginLeft: 4,
  },
  explanationContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.medium,
    borderRadius: BorderRadius.small,
    marginBottom: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.info,
  },
  explanationText: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    lineHeight: 20,
  },
  contextTextContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.medium,
    borderRadius: BorderRadius.small,
    marginBottom: Spacing.medium,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  contextText: {
    fontSize: Typography.size.small,
    color: Colors.black,
    lineHeight: 20,
  },
  highlightedText: {
    backgroundColor: '#fff8e6',
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    borderRadius: BorderRadius.small,
    overflow: 'hidden',
  },
  verificationPrompt: {
    padding: Spacing.small,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.small,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  verificationText: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.medium,
    textAlign: 'center',
  }
});

export default ReviewField;