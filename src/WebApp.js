import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

// Simple web-compatible app version
const WebApp = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MedRec</Text>
        <Text style={styles.headerSubtitle}>Medical Referral Document Processor</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.paragraph}>
            MedRec is a PDF processing application for medical documents that extracts and analyzes 
            information from medical referrals. The app uses AI for document analysis.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>PDF Processing</Text>
              <Text style={styles.featureDescription}>Extract text from PDF documents</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>AI Analysis</Text>
              <Text style={styles.featureDescription}>Process documents with local LLMs via Ollama</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Form Data Extraction</Text>
              <Text style={styles.featureDescription}>Extract structured data from medical referrals</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Document Chat</Text>
              <Text style={styles.featureDescription}>Ask questions about your documents</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <Text style={styles.paragraph}>
            For full functionality, run the native version of the app:
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.code}>npm start</Text>
            <Text style={styles.code}>npm run android</Text>
            <Text style={styles.code}>npm run ios</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>MedRec - Medical Document Processor</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2c3e50',
  },
  featureList: {
    marginTop: 10,
  },
  featureItem: {
    marginBottom: 15,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  featureDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  codeBlock: {
    backgroundColor: '#2c3e50',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  code: {
    fontFamily: 'monospace',
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 5,
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#95a5a6',
  },
});

export default WebApp;