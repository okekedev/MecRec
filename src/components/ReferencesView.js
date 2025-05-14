/**
 * Component to display reference information for chat or document extraction
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows, ZIndex } from '../styles';
import * as Animations from '../animations';

const ReferencesView = ({
  references = [],
  onClose,
  isVisible,
  onSelectReference,
  highlightInDocument = false
}) => {
  // Animation values
  const [slideAnim] = useState(new Animated.Value(300));
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Handle animations when visibility changes
  React.useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animations.fadeIn(fadeAnim, 300),
        Animations.slideInUp(slideAnim, 300, 400),
      ]).start();
    } else {
      Animated.parallel([
        Animations.fadeOut(fadeAnim, 200),
        Animations.slideOutDown(slideAnim, 300, 250),
      ]).start();
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.overlay,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity 
            style={styles.dismissArea} 
            activeOpacity={1} 
            onPress={onClose} 
          />
        </Animated.View>
        
        <Animated.View
          style={[
            styles.panel,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.panelHeader}>
            <View style={styles.panelHandle} />
            <Text style={styles.panelTitle}>Source References</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.referencesContainer}>
            {references.length > 0 ? (
              <>
                <Text style={styles.infoText}>
                  The following sections of the document were used to generate this response:
                </Text>
                
                {references.map((reference, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.referenceItem}
                    onPress={() => onSelectReference && onSelectReference(reference)}
                    disabled={!onSelectReference}
                  >
                    <View style={styles.referenceHeader}>
                      <Text style={styles.referenceType}>
                        {reference.type || reference.location || 'Document Section'}
                      </Text>
                      
                      {reference.score !== undefined && (
                        <Text style={styles.referenceScore}>
                          {Math.round(reference.score * 100)}% match
                        </Text>
                      )}
                    </View>
                    
                    <Text style={styles.referenceText} numberOfLines={3}>
                      {reference.text}
                    </Text>
                    
                    {highlightInDocument && (
                      <Text style={styles.highlightHint}>
                        Tap to highlight in document
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No specific references found. The response may be based on general analysis of the document.
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: ZIndex.modal,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: ZIndex.overlay,
  },
  dismissArea: {
    flex: 1,
  },
  panel: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.large,
    borderTopRightRadius: BorderRadius.large,
    paddingBottom: Spacing.xlarge,
    // Allow panel to take up to 70% of screen height
    maxHeight: '70%',
    ...Shadows.strong,
  },
  panelHeader: {
    alignItems: 'center',
    padding: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    flexDirection: 'row',
  },
  panelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lightGray,
    marginVertical: Spacing.tiny,
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: -20,
  },
  panelTitle: {
    flex: 1,
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    textAlign: 'center',
    marginTop: Spacing.medium,
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.medium,
    top: Spacing.medium,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 28,
    color: Colors.gray,
  },
  referencesContainer: {
    padding: Spacing.medium,
  },
  infoText: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.medium,
    lineHeight: Typography.lineHeight.normal,
  },
  referenceItem: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    marginBottom: Spacing.medium,
    ...Shadows.soft,
  },
  referenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  referenceType: {
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary,
  },
  referenceScore: {
    fontSize: Typography.size.tiny,
    color: Colors.gray,
    backgroundColor: Colors.white,
    paddingVertical: 2,
    paddingHorizontal: Spacing.small,
    borderRadius: BorderRadius.small,
  },
  referenceText: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    lineHeight: Typography.lineHeight.normal,
  },
  highlightHint: {
    fontSize: Typography.size.tiny,
    color: Colors.primary,
    textAlign: 'right',
    marginTop: Spacing.small,
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: Spacing.large,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal,
  },
});

export default ReferencesView;