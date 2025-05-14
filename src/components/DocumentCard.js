/**
 * Enhanced document card component for displaying document items in a list
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';

// Document type icon
const DocumentIcon = ({ type, size = 40, color = Colors.docPdf }) => {
  let iconContent = 'PDF';
  let bgColor = color;
  
  // Determine icon appearance based on document type
  switch (type?.toLowerCase()) {
    case 'referral':
      iconContent = 'REF';
      bgColor = Colors.docReferral;
      break;
    case 'lab':
      iconContent = 'LAB';
      bgColor = Colors.docLab;
      break;
    case 'imaging':
      iconContent = 'IMG';
      bgColor = Colors.docImaging;
      break;
    case 'report':
      iconContent = 'RPT';
      bgColor = Colors.docReport;
      break;
    default:
      iconContent = 'PDF';
      bgColor = color;
  }
  
  return (
    <View style={[styles.iconContainer, { width: size, height: size, backgroundColor: bgColor }]}>
      <Text style={styles.iconText}>{iconContent}</Text>
    </View>
  );
};

const DocumentCard = ({
  document,
  onPress,
  onLongPress,
  style,
}) => {
  // Handle missing document data
  if (!document) {
    return null;
  }
  
  // Extract document info with fallbacks for missing data
  const {
    id,
    name = 'Unnamed Document',
    date = 'Unknown date',
    type = 'pdf',
    size,
    pages = 0,
    isProcessed = false,
    isOcr = false,
  } = document;
  
  // Format date for display
  const formattedDate = date ? new Date(date).toLocaleDateString() : 'Unknown date';
  
  // Format size for display
  let formattedSize = '';
  if (size) {
    formattedSize = size < 1024 * 1024
      ? `${Math.round(size / 1024)} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress && onPress(document)}
      onLongPress={() => onLongPress && onLongPress(document)}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={`Document ${name}`}
      accessibilityRole="button"
    >
      <DocumentIcon type={type} />
      
      <View style={styles.contentContainer}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="middle">
          {name}
        </Text>
        
        <View style={styles.detailsRow}>
          <Text style={styles.date}>{formattedDate}</Text>
          
          {formattedSize ? (
            <Text style={styles.size}>{formattedSize}</Text>
          ) : null}
          
          {pages > 0 ? (
            <Text style={styles.pages}>{pages} page{pages !== 1 ? 's' : ''}</Text>
          ) : null}
        </View>
        
        <View style={styles.tagsContainer}>
          {isProcessed && (
            <View style={[styles.tag, styles.processedTag]}>
              <Text style={styles.tagText}>Processed</Text>
            </View>
          )}
          
          {isOcr && (
            <View style={[styles.tag, styles.ocrTag]}>
              <Text style={styles.tagText}>OCR</Text>
            </View>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.menuButton}
        onPress={(e) => {
          e.stopPropagation();
          onLongPress && onLongPress(document);
        }}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        <View style={styles.menuDot} />
        <View style={styles.menuDot} />
        <View style={styles.menuDot} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    marginBottom: Spacing.medium,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  iconContainer: {
    borderRadius: BorderRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.medium,
  },
  iconText: {
    color: Colors.white,
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.small,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.tiny,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.tiny,
  },
  date: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginRight: Spacing.medium,
  },
  size: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    marginRight: Spacing.medium,
  },
  pages: {
    fontSize: Typography.size.small,
    color: Colors.gray,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.small,
    borderRadius: BorderRadius.small,
    marginRight: Spacing.small,
    marginTop: Spacing.tiny,
  },
  processedTag: {
    backgroundColor: Colors.statusProcessed,
  },
  ocrTag: {
    backgroundColor: Colors.statusOcr,
  },
  tagText: {
    fontSize: Typography.size.tiny,
    color: Colors.white,
    fontWeight: Typography.weight.medium,
  },
  menuButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    marginLeft: Spacing.small,
  },
  menuDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray,
    marginVertical: 1,
  },
});

export default DocumentCard;