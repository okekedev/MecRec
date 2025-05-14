/**
 * Enhanced SettingsScreen with theme and animations
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import EnhancedHeader from '../components/EnhancedHeader';
import AppSideMenu from '../components/AppSideMenu';
import OllamaService from '../services/OllamaService';
import PDFProcessorService from '../services/PDFProcessorService';
import ChatService from '../services/ChatService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles';
import * as Animations from '../animations';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const ollamaService = OllamaService.getInstance();
  const pdfProcessor = PDFProcessorService.getInstance();
  const chatService = ChatService.getInstance();
  
  // Get initial configuration from services
  const initialConfig = ollamaService.getConfig();
  
  // State
  const [ollamaUrl, setOllamaUrl] = useState(initialConfig.baseUrl);
  const [ollamaModel, setOllamaModel] = useState(initialConfig.defaultModel);
  const [useAI, setUseAI] = useState(true);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  
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
  }, []);

  // Test connection to Ollama
  const testConnection = async () => {
    setTesting(true);
    setConnectionStatus('Testing connection...');
    
    try {
      // Update Ollama URL before testing
      ollamaService.setBaseUrl(ollamaUrl);
      
      const result = await ollamaService.testConnection();
      
      if (result) {
        setConnectionStatus('Connected successfully!');
        
        // Try to load available models
        setLoadingModels(true);
        try {
          const models = await ollamaService.getAvailableModels();
          setAvailableModels(models);
          
          // If we don't have a model selected and we got models back, select the first one
          if (models.length > 0 && (!ollamaModel || ollamaModel.trim() === '')) {
            setOllamaModel(models[0]);
          }
        } catch (modelError) {
          console.error('Error loading models:', modelError);
        } finally {
          setLoadingModels(false);
        }
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
      ollamaService.setDefaultModel(ollamaModel);
      
      // Update PDF processor settings
      pdfProcessor.setUseAI(useAI);
      pdfProcessor.configureOllama(ollamaUrl, ollamaModel);
      
      // Update chat service settings
      chatService.setUseAI(useAI);
      chatService.configureOllama(ollamaUrl, ollamaModel);
      
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', `Failed to save settings: ${error.message}`);
    }
  };
  
  // Toggle menu
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  return (
    <View style={styles.container}>
      <EnhancedHeader
        title="Settings"
        showBackButton={true}
        onMenuPress={toggleMenu}
      />
      
      <AppSideMenu
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        currentScreen="Settings"
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
          <Text style={styles.sectionTitle}>AI Integration</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Use AI for processing</Text>
            <Switch
              value={useAI}
              onValueChange={setUseAI}
              trackColor={{ false: Colors.lightGray, true: Colors.primaryLight }}
              thumbColor={useAI ? Colors.primary : Colors.gray}
            />
          </View>
          
          <Text style={styles.settingDescription}>
            When enabled, the app will use AI to extract information from documents 
            and provide intelligent responses in the chat. When disabled, only basic 
            text extraction will be used.
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
          <Text style={styles.sectionTitle}>Ollama Configuration</Text>
          
          <Text style={styles.settingLabel}>Ollama URL</Text>
          <TextInput
            style={styles.input}
            value={ollamaUrl}
            onChangeText={setOllamaUrl}
            placeholder="http://localhost:11434"
            placeholderTextColor={Colors.gray}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
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
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>
                {connectionStatus}
              </Text>
            </View>
          ) : null}
          
          <Text style={styles.settingLabel}>Ollama Model</Text>
          {loadingModels ? (
            <ActivityIndicator size="small" color={Colors.primary} style={styles.modelSpinner} />
          ) : (
            availableModels.length > 0 ? (
              <View style={styles.modelSelector}>
                {availableModels.map((model) => (
                  <TouchableOpacity
                    key={model}
                    style={[
                      styles.modelOption,
                      ollamaModel === model && styles.modelOptionSelected
                    ]}
                    onPress={() => setOllamaModel(model)}
                  >
                    <Text 
                      style={[
                        styles.modelOptionText,
                        ollamaModel === model && styles.modelOptionTextSelected
                      ]}
                    >
                      {model}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={ollamaModel}
                onChangeText={setOllamaModel}
                placeholder="Model name (e.g., llama3, mistral)"
                placeholderTextColor={Colors.gray}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )
          )}
          
          <Text style={styles.settingDescription}>
            Ollama is an open-source platform for running large language models locally.
            You can download models from https://ollama.ai.
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.large,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    ...Shadows.medium,
  },
  sectionTitle: {
    fontSize: Typography.size.large,
    fontWeight: Typography.weight.semibold,
    color: Colors.black,
    marginBottom: Spacing.medium,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  settingLabel: {
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.small,
  },
  settingDescription: {
    fontSize: Typography.size.small,
    color: Colors.gray,
    lineHeight: Typography.lineHeight.normal,
    marginTop: Spacing.small,
  },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    fontSize: Typography.size.medium,
    color: Colors.black,
    marginBottom: Spacing.medium,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonRow: {
    marginBottom: Spacing.medium,
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
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    marginBottom: Spacing.medium,
  },
  statusText: {
    fontSize: Typography.size.small,
    color: Colors.black,
  },
  modelSpinner: {
    marginVertical: Spacing.medium,
  },
  modelSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.medium,
  },
  modelOption: {
    backgroundColor: Colors.lightGray,
    paddingVertical: Spacing.small,
    paddingHorizontal: Spacing.medium,
    borderRadius: BorderRadius.large,
    marginRight: Spacing.small,
    marginBottom: Spacing.small,
  },
  modelOptionSelected: {
    backgroundColor: Colors.primary,
  },
  modelOptionText: {
    color: Colors.black,
    fontSize: Typography.size.small,
  },
  modelOptionTextSelected: {
    color: Colors.white,
    fontWeight: Typography.weight.semibold,
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
});

export default SettingsScreen;