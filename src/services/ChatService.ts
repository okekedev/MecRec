/**
 * Service for AI-powered chat functionality
 * This is a simulation for demonstration purposes
 * In a real app, you would connect to a real AI service like OpenAI, Claude, etc.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatSession {
  documentId: string;
  messages: ChatMessage[];
}

class ChatService {
  private static instance: ChatService;
  private chatSessions: Map<string, ChatSession> = new Map();
  
  private constructor() {}
  
  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }
  
  /**
   * Get or create a chat session for a document
   */
  public getChatSession(documentId: string): ChatSession {
    if (!this.chatSessions.has(documentId)) {
      this.chatSessions.set(documentId, {
        documentId,
        messages: [],
      });
    }
    
    return this.chatSessions.get(documentId)!;
  }
  
  /**
   * Add a user message to the chat session
   */
  public addUserMessage(documentId: string, content: string): ChatMessage {
    const session = this.getChatSession(documentId);
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    
    session.messages.push(message);
    return message;
  }
  
  /**
   * Get a response from the AI assistant
   * In a real app, this would call an AI service
   */
  public async getAIResponse(documentId: string, documentText: string, userMessage: string): Promise<ChatMessage> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Generate a mock response
    const response = this.generateMockResponse(userMessage, documentText);
    
    // Create a message object
    const message: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    };
    
    // Add to session
    const session = this.getChatSession(documentId);
    session.messages.push(message);
    
    return message;
  }
  
  /**
   * Generate a mock AI response based on user input and document text
   * This simulates what a real AI might do with semantic search and reasoning
   */
  private generateMockResponse(userMessage: string, documentText: string): string {
    const lowerUserMessage = userMessage.toLowerCase();
    
    // Check for different question types
    if (lowerUserMessage.includes('patient') && (lowerUserMessage.includes('name') || lowerUserMessage.includes('who'))) {
      // Extract patient name from the document
      const nameMatch = documentText.match(/patient(?:\s+name)?[:\s]+([^\n]+)/i);
      if (nameMatch) {
        return `The patient's name is ${nameMatch[1].trim()}.`;
      }
      return "I couldn't find the patient's name in the document.";
    }
    
    if (lowerUserMessage.includes('diagnosis') || lowerUserMessage.includes('condition') || lowerUserMessage.includes('what is wrong')) {
      const diagnosisMatch = documentText.match(/(?:diagnosis|assessment|impression)[:\s]+([^\n]+)/i);
      if (diagnosisMatch) {
        return `The diagnosis appears to be ${diagnosisMatch[1].trim()}.`;
      }
      return "I couldn't find a clear diagnosis in the document.";
    }
    
    if (lowerUserMessage.includes('doctor') || lowerUserMessage.includes('physician') || lowerUserMessage.includes('who referred')) {
      const physicianMatch = documentText.match(/(?:referring physician|doctor)[:\s]+([^\n]+)/i);
      if (physicianMatch) {
        return `The referring physician is ${physicianMatch[1].trim()}.`;
      }
      return "I couldn't find information about the referring physician.";
    }
    
    if (lowerUserMessage.includes('date') || lowerUserMessage.includes('when')) {
      const dateMatch = documentText.match(/(?:date)[:\s]+([^\n]+)/i);
      if (dateMatch) {
        return `The date on the document is ${dateMatch[1].trim()}.`;
      }
      return "I couldn't find a specific date in the document.";
    }
    
    if (lowerUserMessage.includes('summary') || lowerUserMessage.includes('summarize')) {
      return `This appears to be a medical referral document. It contains patient information, referring physician details, and clinical information including diagnosis and recommended actions. The document is structured as a formal medical referral.`;
    }
    
    // Generic response for other queries
    return "I've analyzed the document but can't provide a specific answer to that question. Please try asking about the patient's name, diagnosis, referring physician, or other specific information that might be contained in a medical referral.";
  }
  
  /**
   * Get all messages for a specific document
   */
  public getMessages(documentId: string): ChatMessage[] {
    const session = this.getChatSession(documentId);
    return [...session.messages];
  }
  
  /**
   * Clear chat history for a document
   */
  public clearChatHistory(documentId: string): void {
    this.chatSessions.set(documentId, {
      documentId,
      messages: [],
    });
  }
}

export default ChatService;