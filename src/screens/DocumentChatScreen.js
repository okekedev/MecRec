import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import ChatService from '../services/ChatService';
import PDFProcessorService from '../services/PDFProcessorService';

const DocumentChatScreen = () => {
  const route = useRoute();
  const { documentId } = route.params;
  const navigation = useNavigation();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentText, setDocumentText] = useState('');
  
  const chatService = ChatService.getInstance();
  const processorService = PDFProcessorService.getInstance();
  
  const flatListRef = useRef(null);
  
  // Load chat history and document text
  useEffect(() => {
    const loadData = async () => {
      // Load chat history
      const chatHistory = chatService.getMessages(documentId);
      setMessages(chatHistory);
      
      // Load document text
      const document = await processorService.getDocumentById(documentId);
      if (document) {
        setDocumentText(document.extractedText);
      }
      
      // Add initial greeting if no messages exist
      if (chatHistory.length === 0) {
        const initialMessage = {
          id: 'initial',
          role: 'assistant',
          content: 'Hello! I can help answer questions about this medical document. What would you like to know?',
          timestamp: Date.now(),
        };
        setMessages([initialMessage]);
      }
    };
    
    loadData();
  }, [documentId]);
  
  const handleSend = async () => {
    if (inputText.trim() === '' || loading) {
      return;
    }
    
    // Add user message
    const userMessage = chatService.addUserMessage(documentId, inputText);
    
    // Update UI with user message
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd();
    }, 100);
    
    try {
      // Get AI response
      const aiResponse = await chatService.getAIResponse(
        documentId,
        documentText,
        userMessage.content
      );
      
      // Update UI with AI response
      setMessages(prev => [...prev, aiResponse]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd();
      }, 100);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Add error message
      const errorMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
          {item.content}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Document Assistant</Text>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onLayout={() => flatListRef.current?.scrollToEnd()}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask a question about the document..."
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, inputText.trim() === '' && styles.disabledSendButton]}
            onPress={handleSend}
            disabled={inputText.trim() === '' || loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#3498db',
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginRight: 40, // To center the title despite the back button
  },
  messagesList: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  userMessageContainer: {
    backgroundColor: '#3498db',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5,
  },
  aiMessageContainer: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: '#2c3e50',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 5,
    opacity: 0.7,
    alignSelf: 'flex-end',
    color: '#f5f5f7',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#3498db',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  disabledSendButton: {
    backgroundColor: '#95a5a6',
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default DocumentChatScreen;