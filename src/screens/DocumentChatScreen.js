/**
 * Updated DocumentChatScreen with correct reference imports
 */
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
  Animated,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import EnhancedHeader from '../components/EnhancedHeader'; // Fixed import path
import ReferenceView from '../screens/ReferenceView';
import ChatService from '../services/ChatService';
import PDFProcessorService from '../services/PDFProcessorService';
import { Colors, Typography, Spacing, BorderRadius, Shadows, ZIndex } from '../styles';
import * as Animations from '../animations';

const DocumentChatScreen = () => {
  const route = useRoute();
  const { documentId } = route.params;
  const navigation = useNavigation();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentText, setDocumentText] = useState('');
  const [documentData, setDocumentData] = useState(null);
  const [showReferences, setShowReferences] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [currentReferences, setCurrentReferences] = useState([]);
  
  const chatService = ChatService.getInstance();
  const processorService = PDFProcessorService.getInstance();
  
  const flatListRef = useRef(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Load chat history and document text
  useEffect(() => {
    const loadData = async () => {
      // Start animations
      Animated.parallel([
        Animations.fadeIn(fadeAnim, 400),
        Animations.slideInUp(slideAnim, 50, 500),
      ]).start();

      // Load chat history
      const chatHistory = chatService.getMessages(documentId);
      setMessages(chatHistory);
      
      // Load document data
      const document = await processorService.getDocumentById(documentId);
      if (document) {
        setDocumentText(document.extractedText);
        setDocumentData(document);
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
  
  // Handle showing references for a message
  const handleShowReferences = (message) => {
    if (message.role !== 'assistant' || message.id === 'initial') {
      return;
    }
    
    // Get references for this message
    const references = message.references || [];
    
    setSelectedMessageId(message.id);
    setCurrentReferences(references);
    setShowReferences(true);
  };
  
  // Handle selecting a reference
  const handleSelectReference = (reference) => {
    // Close references view
    setShowReferences(false);
    
    // Navigate to document viewer with reference highlight info
    navigation.navigate('DocumentViewer', {
      uri: documentData.uri,
      documentId: documentId,
      highlightReference: reference
    });
  };
  
  // Message animation values object
  const getMessageAnimationValue = (index) => {
    const isNewMessage = index === messages.length - 1;
    if (isNewMessage && messages.length > 1) {
      return {
        opacity: new Animated.Value(0),
        translateY: new Animated.Value(20)
      };
    }
    return null;
  };
  
  // Trigger animation for new messages
  const animateNewMessage = (animationValues) => {
    if (animationValues) {
      Animated.parallel([
        Animations.timing(animationValues.opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animations.timing(animationValues.translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };
  
  const renderMessage = ({ item, index }) => {
    const isUser = item.role === 'user';
    const animationValues = getMessageAnimationValue(index);
    const hasReferences = !isUser && item.references && item.references.length > 0;
    
    React.useEffect(() => {
      animateNewMessage(animationValues);
    }, []);
    
    const messageContent = (
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
        activeOpacity={isUser ? 1 : 0.8}
        onPress={() => !isUser && handleShowReferences(item)}
        disabled={isUser || item.id === 'initial'}
      >
        <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
          {item.content}
        </Text>
        
        <View style={styles.messageFooter}>
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.aiTimestamp]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          
          {hasReferences && (
            <TouchableOpacity
              style={styles.referencesButton}
              onPress={() => handleShowReferences(item)}
            >
              <Text style={styles.referencesButtonText}>View Sources</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
    
    if (animationValues) {
      return (
        <Animated.View
          style={{
            opacity: animationValues.opacity,
            transform: [{ translateY: animationValues.translateY }],
          }}
        >
          {messageContent}
        </Animated.View>
      );
    }
    
    return messageContent;
  };
  
  return (
    <View style={styles.container}>
      <EnhancedHeader
        title="Document Assistant"
        showBackButton={true}
      />
      
      <SafeAreaView style={styles.content}>
        <Animated.View
          style={[
            styles.chatContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
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
                placeholderTextColor={Colors.gray}
                multiline
                maxLength={500}
                onSubmitEditing={handleSend}
              />
              
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  inputText.trim() === '' && styles.disabledSendButton
                ]}
                onPress={handleSend}
                disabled={inputText.trim() === '' || loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <View style={styles.sendIcon}>
                    <View style={styles.sendArrow} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
        
        <ReferenceView
          isVisible={showReferences}
          onClose={() => setShowReferences(false)}
          references={currentReferences}
          onSelectReference={handleSelectReference}
          highlightInDocument={true}
        />
      </SafeAreaView>
    </View>
  );
};

// The styles object remains unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  messagesList: {
    padding: Spacing.medium,
    paddingBottom: Spacing.large,
  },
  messageContainer: {
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    marginBottom: Spacing.medium,
    maxWidth: '80%',
    ...Shadows.soft,
  },
  userMessageContainer: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: Spacing.tiny,
  },
  aiMessageContainer: {
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Spacing.tiny,
  },
  messageText: {
    fontSize: Typography.size.medium,
    lineHeight: Typography.lineHeight.normal,
  },
  userMessageText: {
    color: Colors.white,
  },
  aiMessageText: {
    color: Colors.black,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.small,
  },
  timestamp: {
    fontSize: Typography.size.tiny,
    alignSelf: 'flex-start',
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiTimestamp: {
    color: Colors.gray,
  },
  referencesButton: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: Spacing.small,
    borderRadius: BorderRadius.small,
  },
  referencesButtonText: {
    fontSize: Typography.size.tiny,
    color: Colors.primary,
    fontWeight: Typography.weight.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.medium,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    ...Shadows.medium,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.large,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    maxHeight: 100,
    fontSize: Typography.size.medium,
    color: Colors.black,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.round,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.small,
    ...Shadows.soft,
  },
  disabledSendButton: {
    backgroundColor: Colors.gray,
    opacity: 0.7,
  },
  sendIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendArrow: {
    width: 18,
    height: 18,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.white,
    transform: [{ rotate: '45deg' }, { translateX: -4 }],
  },
});

export default DocumentChatScreen;