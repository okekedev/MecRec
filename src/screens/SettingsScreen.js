import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import OllamaService from '../services/OllamaService';
import PDFProcessorService from '../services/PDFProcessorService';
import ChatService from '../services/ChatService';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const ollamaService = OllamaService.getInstance();
  const pdfProcessor = PDFProcessorService.getInstance();
  const chatService = ChatService.getInstance();
  
  // Initial settings from services
  const initialConfig = ollamaService.getConfig();
  
  // State
  const [ollamaUrl, setOllamaUrl] = useState(initialConfig.baseUrl);
  const [ollamaModel, setOllamaModel] = useState(initialConfig.defaultModel);
  const [useAI, setUseAI] = useState(true);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Test connection
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

  return (
    <View style={styles.container}>
      <Header title="Settings" showBackButton={true} />
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Integration</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Use AI for processing</Text>
            <Switch
              value={useAI}
              onValueChange={setUseAI}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={useAI ? '#3498db' : '#f4f3f4'}
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ollama Configuration</Text>
          
          <Text style={styles.settingLabel}>Ollama URL</Text>
          <TextInput
            style={styles.input}
            value={ollamaUrl}
            onChangeText={setOllamaUrl}
            placeholder="http://localhost:11434"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.testButton}
              onPress={testConnection}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Test Connection</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {connectionStatus ? (
            <Text style={styles.statusText}>
              {connectionStatus}
            </Text>
          ) : null}
          
          <Text style={styles.settingLabel}>Ollama Model</Text>
          {loadingModels ? (
            <ActivityIndicator size="small" color="#3498db" style={styles.modelSpinner} />
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
                autoCapitalize="none"
                autoCorrect={false}
              />
            )
          )}
        </View>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
        >
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  statusText: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modelSpinner: {
    marginVertical: 16,
  },
  modelSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  modelOption: {
    backgroundColor: '#f1f2f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 30,
    marginRight: 10,
    marginBottom: 10,
  },
  modelOptionSelected: {
    backgroundColor: '#3498db',
  },
  modelOptionText: {
    color: '#2c3e50',
    fontSize: 14,
  },
  modelOptionTextSelected: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;