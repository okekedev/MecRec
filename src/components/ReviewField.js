// src/components/ReviewField.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch
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
  
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.reviewToggle}>
          <Text style={[
            styles.reviewStatus,
            isReviewed ? styles.reviewedStatus : styles.notReviewedStatus
          ]}>
            {isReviewed ? 'Reviewed' : 'Not Reviewed'}
          </Text>
          <Switch
            value={isReviewed}
            onValueChange={onReviewChange}
            trackColor={{ false: Colors.lightGray, true: Colors.primaryLight }}
            thumbColor={isReviewed ? Colors.primary : Colors.gray}
          />
        </View>
      </View>
      
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          isReviewed && styles.reviewedInput
        ]}
        value={value}
        onChangeText={onValueChange}
        placeholder="No information found"
        placeholderTextColor={Colors.gray}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      
      {sourceText && (
        <View style={styles.sourceContainer}>
          <TouchableOpacity
            style={styles.sourceToggle}
            onPress={() => setShowSource(!showSource)}
          >
            <Text style={styles.sourceToggleText}>
              {showSource ? 'Hide Source' : 'Show Source'}
            </Text>
          </TouchableOpacity>
          
          {showSource && (
            <View style={styles.sourceContent}>
              {sourceType && (
                <Text style={styles.sourceType}>
                  {sourceType}
                </Text>
              )}
              <Text style={styles.sourceText}>
                {sourceText}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.large,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.small,
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
    color: Colors.secondary,
  },
  notReviewedStatus: {
    color: Colors.gray,
  },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    fontSize: Typography.size.medium,
    color: Colors.black,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reviewedInput: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.white,
  },
  sourceContainer: {
    marginTop: Spacing.small,
  },
  sourceToggle: {
    paddingVertical: Spacing.small,
  },
  sourceToggleText: {
    fontSize: Typography.size.small,
    color: Colors.primary,
  },
  sourceContent: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.medium,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.tiny,
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
  },
});

export default ReviewField;