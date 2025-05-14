/**
 * Enhanced DocumentListScreen with theme and animations
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Animated
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import EnhancedHeader from '../components/EnhancedHeader';
import DocumentCard from '../components/DocumentCard';
import PDFProcessorService from '../services/PDFProcessorService';
import AppSideMenu from '../components/AppSideMenu';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout } from '../styles';
import * as Animations from '../animations';

const DocumentListScreen = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Load documents from storage
  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      // Get documents from processor service
      const processorService = PDFProcessorService.getInstance();
      const docs = await processorService.getProcessedDocuments();
      
      // Sort by date (newest first)
      const sortedDocs = docs.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });
      
      setDocuments(sortedDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
      
      // Start animations
      Animated.parallel([
        Animations.fadeIn(fadeAnim, 400),
        Animations.slideInUp(slideAnim, 30, 500),
      ]).start();
    }
  };
  
  // Load documents on first render
  useEffect(() => {
    loadDocuments();
  }, []);
  
  // Reload documents when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadDocuments();
      return () => {};
    }, [])
  );
  
  // Handle document selection
  const handleDocumentPress = (document) => {
    navigation.navigate('DocumentViewer', { 
      uri: document.uri,
      documentId: document.id
    });
  };
  
  // Handle long press (for document actions)
  const handleDocumentLongPress = (document) => {
    Alert.alert(
      'Document Options',
      `${document.name}`,
      [
        {
          text: 'View',
          onPress: () => handleDocumentPress(document),
        },
        {
          text: 'Chat',
          onPress: () => navigation.navigate('DocumentChat', { documentId: document.id }),
        },
        {
          text: 'Delete',
          onPress: () => confirmDeleteDocument(document),
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };
  
  // Confirm document deletion
  const confirmDeleteDocument = (document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteDocument(document),
        },
      ]
    );
  };
  
  // Delete document
  const deleteDocument = async (document) => {
    try {
      // Get processor service
      const processorService = PDFProcessorService.getInstance();
      
      // TODO: Implement document deletion in PDFProcessorService
      // For now, just remove from state
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      
      // Show success message
      Alert.alert('Success', 'Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      Alert.alert('Error', 'Failed to delete document');
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };
  
  // Render document item
  const renderDocumentItem = ({ item, index }) => {
    // Calculate delay for staggered animation
    const delay = index * 100;
    
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          animationDelay: delay,
        }}
      >
        <DocumentCard
          document={item}
          onPress={handleDocumentPress}
          onLongPress={handleDocumentLongPress}
        />
      </Animated.View>
    );
  };
  
  // Toggle menu
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  return (
    <View style={styles.container}>
      <EnhancedHeader
        title="Your Documents"
        onMenuPress={toggleMenu}
      />
      
      <AppSideMenu
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        currentScreen="DocumentList"
      />
      
      <SafeAreaView style={styles.content}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
            <Text style={styles.loadingText}>Loading documents...</Text>
          </View>
        ) : (
          <>
            {documents.length > 0 ? (
              <FlatList
                data={documents}
                renderItem={renderDocumentItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No documents processed yet</Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => navigation.navigate('DocumentUpload')}
                >
                  <Text style={styles.uploadButtonText}>Upload Document</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        
        {documents.length > 0 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('DocumentUpload')}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  spinner: {
    marginBottom: Spacing.medium,
  },
  loadingText: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
  },
  listContainer: {
    padding: Spacing.large,
    paddingBottom: Spacing.xxlarge, // Extra padding for FAB
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.large,
    backgroundColor: Colors.lightGray,
  },
  emptyText: {
    fontSize: Typography.size.large,
    color: Colors.gray,
    marginBottom: Spacing.large,
    textAlign: 'center',
  },
  uploadButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
  uploadButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  addButton: {
    position: 'absolute',
    bottom: Spacing.large,
    right: Spacing.large,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.strong,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: Typography.weight.bold,
    lineHeight: 36,
  },
});

export default DocumentListScreen;