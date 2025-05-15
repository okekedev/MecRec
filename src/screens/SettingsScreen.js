/**
 * Enhanced SettingsScreen with prompt customization and model information
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
  const [extractionPrompt, setExtractionPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [currentModel, setCurrentModel] = useState('');
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [showPromptHelp, setShowPromptHelp] = useState(false);
  const [modelInfo, setModelInfo] = useState({
    model: '',
    status: 'checking',
    message: 'Checking Ollama configuration...'
  });
  
  // Animation references
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
        // Get current configuration
        const currentConfig = ollamaService.getConfig();
        setOllamaUrl(currentConfig.baseUrl || 'http://localhost:11434');
        setCurrentModel(currentConfig.defaultModel || 'llama3.2:1b');
        
        // Load current prompts if available
        if (currentConfig.extractionPrompt) {
          setExtractionPrompt(currentConfig.extractionPrompt);
        }
        if (currentConfig.systemPrompt) {
          setSystemPrompt(currentConfig.systemPrompt);
        }
        
        // Check Ollama configuration
        await checkOllamaConfig();
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  // Check Ollama configuration and model status
  const checkOllamaConfig = async () => {
    try {
      // Check connection
      const isConnected = await ollamaService.testConnection();
      if (!isConnected) {
        setModelInfo({
          model: '',
          status: 'error',
          message: 'Cannot connect to Ollama service. Please make sure it\'s running.'
        });
        return;
      }
      
      // Initialize to find the best model
      await ollamaService.initialize();
      setCurrentModel(ollamaService.defaultModel);
      
      if (ollamaService.defaultModel === 'llama3.2:1b') {
        setModelInfo({
          model: 'llama3.2:1b',
          status: 'success',
          message: 'Using Llama 3.2 1B (1.3GB, 128K context) - Optimized model for medical document extraction'
        });
      } else if (ollamaService.defaultModel) {
        setModelInfo({
          model: ollamaService.defaultModel,
          status: 'warning',
          message: `Using alternative model: ${ollamaService.defaultModel}. For best results, install llama3.2:1b.`
        });
      } else {
        setModelInfo({
          model: '',
          status: 'error',
          message: 'No models available. Please install llama3.2:1b with: ollama pull llama3.2:1b'
        });
      }
    } catch (error) {
      console.error('Error checking Ollama configuration:', error);
      setModelInfo({
        model: '',
        status: 'error',
        message: `Error: ${error.message}`
      });
    }
  };

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
        
        // Try to check model
        await checkOllamaConfig();
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
      ollamaService.setDefaultModel(currentModel);
      
      // Update the prompts in the service
      ollamaService.setExtractionPrompt(extractionPrompt);
      ollamaService.setSystemPrompt(systemPrompt);
      
      // Update PDF processor settings
      pdfProcessor.setUseAI(true); // Always use AI
      pdfProcessor.configureOllama(ollamaUrl, currentModel);
      
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
            // Default extraction prompt optimized for Llama 3.2 1B
            setExtractionPrompt(
`TASK: Extract medical information from the document.

OUTPUT FORMAT: JSON with these exact keys:
- insurance
- location
- dx
- pcp
- dc
- wounds
- antibiotics
- cardiacDrips
- labs
- faceToFace
- history
- mentalHealthState
- additionalComments

EXTRACTION GUIDE:
- "insurance" = all patient insurance details
- "location" = hospital/facility name
- "dx" = diagnosis/medical condition
- "pcp" = primary doctor name
- "dc" = discharge information
- "wounds" = wound descriptions
- "antibiotics" = antibiotic medications
- "cardiacDrips" = heart medications
- "labs" = test results
- "faceToFace" = in-person evaluations
- "history" = patient medical history
- "mentalHealthState" = psychological status
- "additionalComments" = other relevant details

For missing information, use empty string "".
Only output valid JSON with these exact fields.`
            );
            
            // Default system prompt optimized for Llama 3.2 1B
            setSystemPrompt(
`You are a medical information extraction assistant specializing in clinical documents.
Your sole purpose is to extract structured medical information from documents.
You understand medical terminology, abbreviations, and can recognize clinical concepts.
Common medical abbreviations:
- Dx = Diagnosis
- PCP = Primary Care Provider 
- DC = Discharge
- Hx = History
- Tx = Treatment
- Rx = Prescription
- Sx = Symptoms
- PM&R = Physical Medicine and Rehabilitation

Always return a JSON object with exactly the requested field names.
If information is not found, include the field with an empty string.
Do not make up information that isn't present in the document.`
            );
            
            Animations.pulse(buttonScale).start();
          }
        }
      ]
    );
  };
  
  // Install the recommended model
  const showInstallInstructions = () => {
    Alert.alert(
      "Install Llama 3.2 1B",
      "To install the recommended model, run these commands in Terminal:\n\n" +
      "1. ollama serve\n" +
      "2. ollama pull llama3.2:1b\n\n" +
      "You only need to do this once. The model is 1.3GB and supports a 128K context window.",
      [{ text: "OK" }]
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
          
          {/* Model info section */}
          <View style={[
            styles.modelInfoCard,
            modelInfo.status === 'error' ? styles.errorModelCard : 
            modelInfo.status === 'warning' ? styles.warningModelCard : 
            styles.successModelCard
          ]}>
            <View style={styles.modelInfoHeader}>
              <Text style={styles.modelInfoTitle}>AI Model Status</Text>
              <View style={[
                styles.statusIndicator,
                modelInfo.status === 'error' ? styles.errorIndicator :
                modelInfo.status === 'warning' ? styles.warningIndicator :
                styles.successIndicator
              ]} />
            </View>
            
            {modelInfo.model ? (
              <Text style={styles.modelName}>{modelInfo.model}</Text>
            ) : null}
            
            <Text style={styles.modelMessage}>{modelInfo.message}</Text>
            
            {modelInfo.status === 'error' && (
              <TouchableOpacity 
                style={styles.installButton}
                onPress={showInstallInstructions}
              >
                <Text style={styles.installButtonText}>Show Install Instructions</Text>
              </TouchableOpacity>
            )}
          </View>
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
          
          {/* Add separator and more spacing before description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.settingDescription}>
              These prompts control how the AI extracts information from medical documents. The extraction prompt defines what fields to extract, while the system prompt sets the overall behavior.
            </Text>
          </View>
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
              
              <Text style={styles.modalSubtitle}>Model Information</Text>
              <Text style={styles.modalText}>
                This application is optimized to use Llama 3.2 1B (1.3GB), which provides an excellent balance of performance and efficiency for medical document extraction. This model can run on CPU and has a 128K context window allowing it to handle large documents.
              </Text>
              
              <Text style={styles.modalSubtitle}>Best Practices</Text>
              <Text style={styles.modalText}>
                • Keep descriptions clear and concise
                • Be specific about expected formats
                • Always include instructions to return valid JSON
                • Avoid contradictory instructions
                • Include medical terminology in the system prompt
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
  // Container for description text to add visual separation
  descriptionContainer: {
    marginTop: Spacing.large,
    paddingTop: Spacing.medium,
    borderTopWidth: 1,
    borderTopColor: '#f0f4f8',
  },
  settingDescription: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    lineHeight: Typography.lineHeight.normal,
    marginBottom: Spacing.small,
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
  // Model info card styles
  modelInfoCard: {
    marginTop: Spacing.medium,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    marginBottom: Spacing.small,
  },
  errorModelCard: {
    backgroundColor: Colors.accentLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  warningModelCard: {
    backgroundColor: '#fff8e6',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  successModelCard: {
    backgroundColor: Colors.secondaryLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  modelInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  modelInfoTitle: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  errorIndicator: {
    backgroundColor: Colors.accent,
  },
  warningIndicator: {
    backgroundColor: Colors.warning,
  },
  successIndicator: {
    backgroundColor: Colors.secondary,
  },
  modelName: {
    fontSize: Typography.size.medium,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
    marginBottom: Spacing.tiny,
  },
  modelMessage: {
    fontSize: Typography.size.small,
    color: Colors.black,
    lineHeight: Typography.lineHeight.normal,
  },
  installButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.small,
    borderRadius: BorderRadius.small,
    alignItems: 'center',
    marginTop: Spacing.medium,
  },
  installButtonText: {
    color: Colors.white,
    fontSize: Typography.size.small,
    fontWeight: Typography.weight.medium,
  },
});

export default SettingsScreen;