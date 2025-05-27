// Enhanced ReviewField.js with detailed embeddings source tracking display
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
    outputRange: [0, 300] // Increased height for enhanced details
  });
  
  // Map field label to a numbered list format label for consistent reference
  const getNumberedListLabel = () => {
    // Create a mapping from field names to their position in the numbered list
    const fieldMapping = {
      'Patient Name': 1,
      'Date of Birth': 2,
      'Insurance Information': 3,
      'Location/Facility': 4,
      'Diagnosis (Dx)': 5,
      'Primary Care Provider (PCP)': 6,
      'Discharge (DC)': 7,
      'Wounds/Injuries': 8,
      'Medications & Antibiotics': 9, // Updated
      'Cardiac Medications/Drips': 10,
      'Labs & Vital Signs': 11, // Updated
      'Face-to-Face Evaluations': 12,
      'Medical History': 13,
      'Mental Health State': 14,
      'Additional Comments': 15
    };
    
    // Return the numbered label if found, otherwise use the original label
    const number = fieldMapping[label];
    return number ? `${number}. ${label}` : label;
  };
  
  // Parse enhanced source information
  const parseSourceInfo = () => {
    if (!sourceType) return null;
    
    // Extract different pieces of information from sourceType
    const parts = sourceType.split(' - ');
    const location = parts[0] || 'Unknown location';
    const confidence = parts[1] || '';
    
    // Parse confidence information
    let matchType = '';
    let confidenceScore = '';
    let pageNumber = '';
    
    if (confidence) {
      // Extract match type (exact, semantic, keyword, contextual)
      const matchTypeMatch = confidence.match(/(\w+)\s+match/);
      if (matchTypeMatch) {
        matchType = matchTypeMatch[1];
      }
      
      // Extract confidence percentage
      const confidenceMatch = confidence.match(/\((\d+)%\s+confidence\)/);
      if (confidenceMatch) {
        confidenceScore = confidenceMatch[1];
      }
      
      // Extract page number
      const pageMatch = confidence.match(/Page\s+(\d+)/);
      if (pageMatch) {
        pageNumber = pageMatch[1];
      }
    }
    
    return {
      location,
      matchType,
      confidenceScore,
      pageNumber,
      hasEnhancedInfo: !!(matchType || confidenceScore || pageNumber)
    };
  };
  
  const sourceInfo = parseSourceInfo();
  
  // Get confidence color based on score
  const getConfidenceColor = (score) => {
    if (!score) return Colors.gray;
    const numScore = parseInt(score, 10);
    if (numScore >= 80) return Colors.success;
    if (numScore >= 60) return Colors.warning;
    return Colors.accent;
  };
  
  // Get match type icon
  const getMatchTypeIcon = (matchType) => {
    switch (matchType?.toLowerCase()) {
      case 'exact':
        return 'bullseye-arrow';
      case 'semantic':
        return 'brain';
      case 'keyword':
        return 'key';
      case 'contextual':
        return 'file-search-outline';
      default:
        return 'help-circle-outline';
    }
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
        
        {/* Enhanced source reference section */}
        {sourceText && (
          <View style={modernStyles.sourceContainer}>
            <TouchableOpacity
              style={modernStyles.sourceToggle}
              onPress={toggleSource}
            >
              <View style={modernStyles.sourceToggleContent}>
                <View style={modernStyles.sourceToggleLeft}>
                  <MaterialCommunityIcons 
                    name="file-find-outline" 
                    size={16} 
                    color={Colors.primary} 
                    style={modernStyles.sourceToggleIcon}
                  />
                  <Text style={modernStyles.sourceToggleText}>
                    {showSource ? 'Hide Source Context' : 'Show Source Context'}
                  </Text>
                </View>
                
                {/* Enhanced confidence indicator */}
                {sourceInfo?.hasEnhancedInfo && (
                  <View style={modernStyles.confidenceIndicator}>
                    {sourceInfo.matchType && (
                      <View style={modernStyles.matchTypeContainer}>
                        <MaterialCommunityIcons 
                          name={getMatchTypeIcon(sourceInfo.matchType)}
                          size={12} 
                          color={Colors.primary}
                        />
                        <Text style={modernStyles.matchTypeText}>
                          {sourceInfo.matchType}
                        </Text>
                      </View>
                    )}
                    
                    {sourceInfo.confidenceScore && (
                      <View style={[
                        modernStyles.confidenceScore,
                        { backgroundColor: getConfidenceColor(sourceInfo.confidenceScore) + '20' }
                      ]}>
                        <Text style={[
                          modernStyles.confidenceScoreText,
                          { color: getConfidenceColor(sourceInfo.confidenceScore) }
                        ]}>
                          {sourceInfo.confidenceScore}%
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                
                <View style={[
                  modernStyles.toggleArrow,
                  showSource && modernStyles.toggleArrowUp
                ]} />
              </View>
            </TouchableOpacity>
            
            <Animated.View 
              style={[
                modernStyles.sourceContentContainer,
                { maxHeight }
              ]}
            >
              <View style={modernStyles.sourceContent}>
                {/* Enhanced source metadata */}
                <View style={modernStyles.sourceMetadata}>
                  <View style={modernStyles.metadataRow}>
                    <MaterialIcons name="location-on" size={14} color={Colors.primary} />
                    <Text style={modernStyles.metadataLabel}>Found in:</Text>
                    <Text style={modernStyles.metadataValue}>
                      {sourceInfo?.location || 'Document section'}
                    </Text>
                  </View>
                  
                  {sourceInfo?.pageNumber && (
                    <View style={modernStyles.metadataRow}>
                      <MaterialIcons name="description" size={14} color={Colors.primary} />
                      <Text style={modernStyles.metadataLabel}>Page:</Text>
                      <Text style={modernStyles.metadataValue}>{sourceInfo.pageNumber}</Text>
                    </View>
                  )}
                  
                  {sourceInfo?.matchType && (
                    <View style={modernStyles.metadataRow}>
                      <MaterialCommunityIcons 
                        name={getMatchTypeIcon(sourceInfo.matchType)} 
                        size={14} 
                        color={Colors.primary} 
                      />
                      <Text style={modernStyles.metadataLabel}>Match type:</Text>
                      <Text style={modernStyles.metadataValue}>
                        {sourceInfo.matchType.charAt(0).toUpperCase() + sourceInfo.matchType.slice(1)}
                      </Text>
                    </View>
                  )}
                  
                  {sourceInfo?.confidenceScore && (
                    <View style={modernStyles.metadataRow}>
                      <MaterialIcons name="verified" size={14} color={getConfidenceColor(sourceInfo.confidenceScore)} />
                      <Text style={modernStyles.metadataLabel}>Confidence:</Text>
                      <Text style={[
                        modernStyles.metadataValue,
                        { color: getConfidenceColor(sourceInfo.confidenceScore) }
                      ]}>
                        {sourceInfo.confidenceScore}%
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Source text with highlighting */}
                <View style={modernStyles.sourceTextContainer}>
                  <Text style={modernStyles.sourceTextLabel}>Source Context:</Text>
                  <View style={modernStyles.sourceTextBox}>
                    <Text style={modernStyles.sourceText}>
                      {sourceText}
                    </Text>
                  </View>
                </View>
                
                {/* Match quality indicator */}
                {sourceInfo?.confidenceScore && (
                  <View style={modernStyles.qualityIndicator}>
                    <Text style={modernStyles.qualityLabel}>Reference Quality:</Text>
                    <View style={modernStyles.qualityBar}>
                      <View 
                        style={[
                          modernStyles.qualityFill,
                          { 
                            width: `${sourceInfo.confidenceScore}%`,
                            backgroundColor: getConfidenceColor(sourceInfo.confidenceScore)
                          }
                        ]} 
                      />
                    </View>
                    <Text style={modernStyles.qualityDescription}>
                      {parseInt(sourceInfo.confidenceScore, 10) >= 80 ? 'High confidence match' :
                       parseInt(sourceInfo.confidenceScore, 10) >= 60 ? 'Moderate confidence match' :
                       'Lower confidence - please verify'}
                    </Text>
                  </View>
                )}
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
  sourceContainer: {
    borderTopWidth: 1,
    borderTopColor: '#edf0f7',
  },
  sourceToggle: {
    padding: Spacing.medium,
    backgroundColor: '#f8fafc',
  },
  sourceToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceToggleIcon: {
    marginRight: Spacing.small,
  },
  sourceToggleText: {
    fontSize: Typography.size.small,
    color: Colors.primary,
    fontWeight: Typography.weight.medium,
    flex: 1,
  },
  confidenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.small,
  },
  matchTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.small,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.small,
  },
  matchTypeText: {
    fontSize: Typography.size.tiny,
    color: Colors.primary,
    marginLeft: 2,
    fontWeight: Typography.weight.medium,
  },
  confidenceScore: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.small,
  },
  confidenceScoreText: {
    fontSize: Typography.size.tiny,
    fontWeight: Typography.weight.bold,
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
  sourceMetadata: {
    marginBottom: Spacing.medium,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.tiny,
  },
  metadataLabel: {
    fontSize: Typography.size.small,
    color: Colors.primary,
    fontWeight: Typography.weight.medium,
    marginLeft: Spacing.tiny,
    marginRight: Spacing.tiny,
  },
  metadataValue: {
    fontSize: Typography.size.small,
    color: Colors.black,
    flex: 1,
  },
  sourceTextContainer: {
    marginBottom: Spacing.medium,
  },
  sourceTextLabel: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.small,
  },
  sourceTextBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.small,
    padding: Spacing.small,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  sourceText: {
    fontSize: Typography.size.small,
    color: Colors.black,
    lineHeight: 20,
  },
  qualityIndicator: {
    borderTopWidth: 1,
    borderTopColor: '#e0e7ff',
    paddingTop: Spacing.small,
  },
  qualityLabel: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.medium,
    color: Colors.primary,
    marginBottom: Spacing.tiny,
  },
  qualityBar: {
    height: 4,
    backgroundColor: '#e0e7ff',
    borderRadius: 2,
    marginBottom: Spacing.tiny,
    overflow: 'hidden',
  },
  qualityFill: {
    height: '100%',
  },
  qualityDescription: {
    fontSize: Typography.size.tiny,
    color: Colors.gray,
    fontStyle: 'italic',
  },
});

export default ReviewField;