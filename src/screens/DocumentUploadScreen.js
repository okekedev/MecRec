import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DocumentUploader from '../components/DocumentUploader';

const DocumentUploadScreen = () => {
  const navigation = useNavigation();

  const handleDocumentProcessed = (processedDocument) => {
    // Navigate to the document viewer with the processed document
    navigation.navigate('DocumentViewer', { 
      uri: processedDocument.uri,
      documentId: processedDocument.id
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload Medical Document</Text>
        <Text style={styles.subtitle}>Select a PDF medical referral to process</Text>
      </View>
      
      <View style={styles.content}>
        <DocumentUploader onDocumentProcessed={handleDocumentProcessed} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default DocumentUploadScreen;