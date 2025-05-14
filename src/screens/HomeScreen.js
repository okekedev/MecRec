import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import { isWeb } from '../utils/platform';

const HomeScreen = () => {
  const navigation = useNavigation();
  
  // Create a settings button for the header
  const SettingsButton = () => (
    <Pressable 
      style={styles.settingsButton}
      onPress={() => navigation.navigate('Settings')}
    >
      <Text style={styles.settingsButtonText}>⚙️</Text>
    </Pressable>
  );

  const FeatureCard = ({ title, description, icon, onPress }) => (
    <Pressable
      style={({ pressed }) => [
        styles.featureCard,
        pressed && styles.cardPressed
      ]}
      onPress={onPress}
    >
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Header rightComponent={<SettingsButton />} />
      
      <SafeAreaView style={styles.contentContainer}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>MedRec</Text>
            <Text style={styles.subtitle}>Medical Referral Document Processor</Text>
          </View>
          
          <View style={styles.cardContainer}>
            <FeatureCard
              title="Upload Document"
              description="Process a new medical referral"
              icon="📄"
              onPress={() => navigation.navigate('DocumentUpload')}
            />
            
            <FeatureCard
              title="My Documents"
              description="View your processed medical documents"
              icon="📁"
              onPress={() => navigation.navigate('DocumentList')}
            />
            
            <FeatureCard
              title="AI Integration"
              description="Configure AI settings"
              icon="🤖"
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>What is MedRec?</Text>
            <Text style={styles.infoText}>
              MedRec is a PDF processing application that extracts text, analyzes content, and allows 
              you to chat with your medical referral documents. It uses AI to extract structured form 
              data from your medical documents.
            </Text>
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Process, analyze, and extract data from medical referrals</Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
  },
  settingsButtonText: {
    fontSize: 24,
  },
  cardContainer: {
    marginBottom: 30,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...(isWeb ? {
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
      cursor: 'pointer',
    } : {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  featureIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  infoSection: {
    backgroundColor: '#e8f4fc',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2980b9',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#34495e',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    color: '#95a5a6',
    textAlign: 'center',
  },
});

export default HomeScreen;