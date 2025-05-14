/**
 * Component to display OCR processing progress
 */
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows, ZIndex } from '../styles';

const OCRProgressIndicator = ({ progress }) => {
  if (!progress) {
    return null;
  }

  const { status, progress: progressValue, page, totalPages } = progress;
  const progressPercent = Math.round(progressValue * 100);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
        
        <Text style={styles.status}>{status}</Text>
        
        {page && totalPages && (
          <Text style={styles.pageInfo}>
            Page {page} of {totalPages}
          </Text>
        )}
        
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${progressPercent}%` }
            ]} 
          />
        </View>
        
        <Text style={styles.progressText}>{progressPercent}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: ZIndex.overlay,
  },
  content: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    ...Shadows.medium,
  },
  spinner: {
    marginBottom: Spacing.medium,
  },
  status: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.small,
    textAlign: 'center',
  },
  pageInfo: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginBottom: Spacing.medium,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.small,
    overflow: 'hidden',
    marginBottom: Spacing.small,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressText: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
});

export default OCRProgressIndicator;