/**
 * Enhanced SettingsScreen with prompt customization
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import EnhancedHeader from '../components/EnhancedHeader';
import OllamaService from '../services/OllamaService';
import PDFProcessorService from '../services/PDFProcessorService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';
import * as Animations from '../animations';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const ollamaService = OllamaService.getInstance();
  const pdfProcessor = PDFProcessorService.getInstance();
  
  // Default admin password
  const ADMIN_PASSWORD = 'admin';
  
  // State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [extractionPrompt, setExtractionPrompt] = useState(
    `Extract the following information from the text into a JSON object:
- insurance: Patient's insurance provider
- location: Treatment or facility location
- dx: Diagnosis (Dx)
- pcp: Primary Care Provider (PCP)
- dc: Discharge (DC) information
- wounds: Information about wounds, wound care, or wound assessment
- antibiotics: Antibiotic medications and treatments
- cardiacDrips: Cardiac drips or cardiac medications
- labs: Laboratory results and values
- faceToFace: Face to face encounters or assessments
- history: Patient medical history
- mentalHealthState: Mental health status or assessments
- additionalComments: Additional notes or comments

If a field is not found, set it to null or an empty string.
Return ONLY a valid JSON object with the field names exactly as specified.`
  );
  const [systemPrompt, setSystemPrompt] = useState(
    `You are an AI assistant specialized in extracting structured information from medical documents. 
Your task is to extract specific fields of information and return them in a clean, valid JSON format.
Return ONLY the JSON object with no additional text, ensuring it can be parsed directly with JSON.parse().`
  );
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [showPromptHelp, setShowPromptHelp] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Apply animations on mount
  useEffect(() => {
    Animated.parallel([
      Animations.fadeIn(fadeAnim, 500),
      Animations.slideInUp(slideAnim, 50, 600),
    ]).start();
    
    // Load current prompts from service
    const loadSettings = async () => {
      try {
        // In a real app, you would retrieve these from storage
        // For now, we'll just use the defaults
        const currentConfig = ollamaService.getConfig();
        setOllamaUrl(currentConfig.baseUrl || 'http://localhost:11434');
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  // Handle authentication
  const handleAuthenticate = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Invalid password. The default is "admin".');
      Animations.shake(slideAnim, 10, 300).start();
    }
  };

  // Test connection to Ollama
  const testConnection = async () => {
    setTesting(true);
    setConnectionStatus('Testing connection...');
    
    try {
      // Update Ollama URL before testing
      ollamaService.setBaseUrl(ollamaUrl);
      
      const result = await ollamaService.testConnection();
      
      if (result) {
        setConnectionStatus('Connected successfully to Ollama server!');
      } else {
        setConnectionStatus('Connection failed. Check URL and ensure Ollama is running.');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus(`Error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  // Save settings
  const saveSettings = () => {
    try {
      // Animate button
      Animations.pulse(buttonScale).start();
      
      // Update Ollama settings
      ollamaService.setBaseUrl(ollamaUrl);
      ollamaService.setDefaultModel('llama3.2'); // Hard-coded to always use llama3.2
      
      // Store extraction prompts (in a real app, you'd save these to storage)
      // This would update a method in OllamaService to use these custom prompts
      
      // Update PDF processor settings
      pdfProcessor.setUseAI(true); // Always use AI
      pdfProcessor.configureOllama(ollamaUrl, 'llama3.2');
      
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', `Failed to save settings: ${error.message}`);
    }
  };
  
  // Reset prompts to defaults
  const resetPrompts = () => {
    Alert.alert(
      'Reset Prompts',
      'Are you sure you want to reset the extraction prompts to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            setExtractionPrompt(
              `Extract the following information from the text into a JSON object:
- insurance: Patient's insurance provider
- location: Treatment or facility location
- dx: Diagnosis (Dx)
- pcp: Primary Care Provider (PCP)
- dc: Discharge (DC) information
- wounds: Information about wounds, wound care, or wound assessment
- antibiotics: Antibiotic medications and treatments
- cardiacDrips: Cardiac drips or cardiac medications
- labs: Laboratory results and values
- faceToFace: Face to face encounters or assessments
- history: Patient medical history
- mentalHealthState: Mental health status or assessments
- additionalComments: Additional notes or comments

If a field is not found, set it to null or an empty string.
Return ONLY a valid JSON object with the field names exactly as specified.`
            );
            
            setSystemPrompt(
              `You are an AI assistant specialized in extracting structured information from medical documents. 
Your task is to extract specific fields of information and return them in a clean, valid JSON format.
Return ONLY the JSON object with no additional text, ensuring it can be parsed directly with JSON.parse().`
            );
            
            Animations.pulse(buttonScale).start();
          }
        }
      ]
    );
  };
  
  // Render authentication screen
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <EnhancedHeader
          title="Admin Authentication"
          showBackButton={true}
        />
        
        <Animated.View style={[
          styles.authContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Administrator Access</Text>
            <Text style={styles.authDescription}>
              Enter the admin password to access system settings.
              The default password is "admin".
            </Text>
            
            <TextInput
              style={[
                styles.authInput,
                passwordError ? styles.authInputError : null
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter admin password"
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={handleAuthenticate}
            />
            
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
            
            <TouchableOpacity
              style={styles.authButton}
              onPress={handleAuthenticate}
            >
              <Text style={styles.authButtonText}>Authenticate</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <EnhancedHeader
        title="System Settings"
        showBackButton={true}
      />
      
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ollama Server Configuration</Text>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowPromptHelp(true)}
            >
              <Text style={styles.helpButtonText}>?</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.settingLabel}>Ollama Server URL</Text>
          <TextInput
            style={styles.input}
            value={ollamaUrl}
            onChangeText={setOllamaUrl}
            placeholder="http://localhost:11434"
            placeholderTextColor={Colors.gray}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <Text style={styles.settingDescription}>
            The URL where your Ollama server is running. The default is http://localhost:11434 for local installations.
          </Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.testButton, testing && styles.disabledButton]}
              onPress={testConnection}
              disabled={testing}
              activeOpacity={0.8}
            >
              {testing ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Test Connection</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {connectionStatus ? (
            <View style={[
              styles.statusContainer,
              connectionStatus.includes('successfully') ? styles.successStatus : styles.errorStatus
            ]}>
              <Text style={styles.statusText}>
                {connectionStatus}
              </Text>
            </View>
          ) : null}
          
          <Text style={styles.modelInfo}>
            Model: llama3.2 (Fixed)
          </Text>
        </Animated.View>
        
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              marginTop: Spacing.large,
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Extraction Prompt Customization</Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetPrompts}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.settingLabel}>Main Extraction Prompt</Text>
          <TextInput
            style={[styles.input, styles.textareaInput]}
            value={extractionPrompt}
            onChangeText={setExtractionPrompt}
            placeholder="Enter extraction prompt..."
            placeholderTextColor={Colors.gray}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />
          
          <Text style={styles.settingLabel}>System Context</Text>
          <TextInput
            style={[styles.input, styles.textareaInput]}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Enter system prompt..."
            placeholderTextColor={Colors.gray}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          
          <Text style={styles.settingDescription}>
            These prompts control how the AI extracts information from medical documents.
            The main extraction prompt defines which fields to extract, while the system
            context provides general guidance to the AI.
          </Text>
        </Animated.View>
        
        <Animated.View
          style={{
            marginTop: Spacing.large,
            marginBottom: Spacing.xlarge,
            transform: [{ scale: buttonScale }],
          }}
        >
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveSettings}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
      
      {/* Prompt help modal */}
      <Modal
        visible={showPromptHelp}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPromptHelp(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Prompt Customization Help</Text>
            
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalSubtitle}>How Prompts Work</Text>
              <Text style={styles.modalText}>
                The extraction prompt is used to tell the AI which fields to extract from medical documents.
                Each field should be defined with a clear description.
              </Text>
              
              <Text style={styles.modalSubtitle}>Field Format</Text>
              <Text style={styles.modalText}>
                Fields should be formatted as:
              </Text>
              <Text style={styles.codeBlock}>
                - fieldName: Description of what to extract
              </Text>
              
              <Text style={styles.modalSubtitle}>Required Fields</Text>
              <Text style={styles.modalText}>
                The following fields are required for the application to function properly:
              </Text>
              <Text style={styles.codeBlock}>
                insurance, location, dx, pcp, dc, wounds, antibiotics, cardiacDrips, labs, faceToFace, history, mentalHealthState, additionalComments
              </Text>
              
              <Text style={styles.modalSubtitle}>System Context</Text>
              <Text style={styles.modalText}>
                The system context provides general guidance to the AI about its role and how to format responses.
                It should always instruct the AI to return a valid JSON object.
              </Text>
              
              <Text style={styles.modalSubtitle}>Best Practices</Text>
              <Text style={styles.modalText}>
                • Keep descriptions clear and concise
                • Be specific about expected formats
                • Always include instructions to return valid JSON
                • Avoid contradictory instructions
              </Text>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPromptHelp(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.large,
    paddingBottom: 100, // Extra space for keyboard
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.large,
  },
  authCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    width: '100%',
    maxWidth: 400,
    ...Shadows.medium,
  },
  authTitle: {
    fontSize: Typography.size.xlarge,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
    marginBottom: Spacing.medium,
    textAlign: 'center',
  },
  authDescription: {
    fontSize: Typography.size.medium,
    color: Colors.gray,
    marginBottom: Spacing.large,
    textAlign: 'center',
    lineHeight: 22,
  },
  authInput: {
    backgroundColor: '#f0f4f8',
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.medium,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  authInputError: {
    borderColor: Colors.error,
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.size.small,
    marginBottom: Spacing.medium,
  },
  authButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.medium,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    ...Shadows.soft,
  },
  authButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    ...Shadows.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  sectionTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
  },
  helpButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButtonText: {
    color: Colors.primary,
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.bold,
  },
  resetButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.small,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resetButtonText: {
    color: Colors.accent,
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.medium,
  },
  settingLabel: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.small,
    fontWeight: Typography.weight.medium,
  },
  settingDescription: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    lineHeight: Typography.lineHeight.normal,
    marginTop: Spacing.small,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.medium,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textareaInput: {
    minHeight: 150,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: Typography.size.small,
  },
  buttonRow: {
    marginVertical: Spacing.medium,
  },
  testButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    ...Shadows.soft,
  },
  disabledButton: {
    backgroundColor: Colors.gray,
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  statusContainer: {
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    marginBottom: Spacing.medium,
  },
  successStatus: {
    backgroundColor: Colors.secondaryLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  errorStatus: {
    backgroundColor: Colors.accentLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  statusText: {
    fontSize: Typography.size.small,
    color: Colors.black,
  },
  modelInfo: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: Spacing.small,
  },
  saveButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.medium,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    ...Shadows.medium,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.large,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Shadows.strong,
  },
  modalTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.bold,
    color: Colors.black,
    marginBottom: Spacing.medium,
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalSubtitle: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary,
    marginTop: Spacing.medium,
    marginBottom: Spacing.small,
  },
  modalText: {
    fontSize: Typography.size.small,
    color: Colors.black,
    lineHeight: 20,
    marginBottom: Spacing.small,
  },
  codeBlock: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: Typography.size.small,
    backgroundColor: '#f1f5f9',
    padding: Spacing.medium,
    borderRadius: BorderRadius.small,
    color: '#334155',
    marginBottom: Spacing.medium,
  },
  modalCloseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.medium,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    marginTop: Spacing.large,
  },
  modalCloseButtonText: {
    color: Colors.white,
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
  },
});

export default SettingsScreen;