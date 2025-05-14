/**
 * Enhanced ChatService with context tracking and reference capabilities
 */
import OllamaService from './OllamaService';
import DocumentReferenceService from './DocumentReferenceService';

class ChatService {
  static instance;
  
  constructor() {
    this.chatSessions = new Map();
    this.ollamaService = OllamaService.getInstance();
    this.referenceService = DocumentReferenceService.getInstance();
    this.useAI = true;
  }
  
  /**
   * Set whether to use AI for chat responses
   */
  setUseAI(useAI) {
    this.useAI = useAI;
  }
  
  /**
   * Configure the Ollama service
   */
  configureOllama(baseUrl, model) {
    this.ollamaService.setBaseUrl(baseUrl);
    this.ollamaService.setDefaultModel(model);
  }
  
  static getInstance() {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }
  
  /**
   * Get or create a chat session for a document
   */
  getChatSession(documentId) {
    if (!this.chatSessions.has(documentId)) {
      this.chatSessions.set(documentId, {
        documentId,
        messages: [],
        references: [],
      });
    }
    
    return this.chatSessions.get(documentId);
  }
  
  /**
   * Add a user message to the chat session
   */
  addUserMessage(documentId, content) {
    const session = this.getChatSession(documentId);
    
    const message = {
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
   * Uses Ollama if enabled, otherwise falls back to mock responses
   */
  async getAIResponse(documentId, documentText, userMessage) {
    let response;
    let references = [];
    
    // Try to use Ollama if AI is enabled
    if (this.useAI) {
      try {
        // Check if Ollama is available
        const connectionTest = await this.ollamaService.testConnection();
        
        if (connectionTest) {
          // Analyze document to find relevant sections
          const relevantSections = await this.referenceService.findRelevantSections(
            documentText, 
            userMessage
          );
          
          // Create a more concise document context with only relevant sections
          let contextText = "Here is the content of the document:\n\n";
          
          if (relevantSections.length > 0) {
            // Add relevant sections and track references
            relevantSections.forEach((section, index) => {
              contextText += `[Section ${index + 1}]: ${section.text}\n\n`;
              references.push({
                id: `section-${index + 1}`,
                text: section.text,
                location: section.location,
                score: section.score
              });
            });
          } else {
            // Fall back to using the full document text
            contextText += documentText;
          }
          
          // Create a system prompt that includes the document context
          const systemPrompt = `You are an assistant helping with a medical document. 
${contextText}

Please answer questions about this document accurately based on its content.
If the answer cannot be found in the document, say so clearly.
Keep responses concise and professional.

When referencing specific information, mention which section it came from.`;

          // Use Ollama to generate a response
          response = await this.ollamaService.generateCompletion(userMessage, undefined, systemPrompt, {
            temperature: 0.3, // Lower temperature for more deterministic responses
          });
          
          console.log('Used Ollama for chat response with references');
        } else {
          // Fall back to mock response
          const mockResult = this.generateMockResponse(userMessage, documentText);
          response = mockResult.response;
          references = mockResult.references;
          console.log('Ollama not available, using mock response');
        }
      } catch (aiError) {
        console.warn('AI chat failed, falling back to mock response:', aiError);
        // Fall back to mock response
        const mockResult = this.generateMockResponse(userMessage, documentText);
        response = mockResult.response;
        references = mockResult.references;
      }
    } else {
      // Use mock response when AI is disabled
      // Add a small delay to simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      const mockResult = this.generateMockResponse(userMessage, documentText);
      response = mockResult.response;
      references = mockResult.references;
    }
    
    // Create a message object
    const message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      references: references,
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
  generateMockResponse(userMessage, documentText) {
    const lowerUserMessage = userMessage.toLowerCase();
    let response = "";
    let references = [];
    
    // Helper function to create a reference
    const createReference = (text, location = "unknown", score = 0.8) => {
      return {
        id: `mock-ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        text: text,
        location: location,
        score: score
      };
    };
    
    // Check for different question types
    if (lowerUserMessage.includes('patient') && (lowerUserMessage.includes('name') || lowerUserMessage.includes('who'))) {
      // Extract patient name from the document
      const nameMatch = documentText.match(/patient(?:\s+name)?[:\s]+([^\n]+)/i);
      if (nameMatch) {
        response = `According to section 1, the patient's name is ${nameMatch[1].trim()}.`;
        references.push(createReference(nameMatch[0], "Patient Information", 0.95));
        return { response, references };
      }
      response = "I couldn't find the patient's name in the document.";
      return { response, references };
    }
    
    if (lowerUserMessage.includes('diagnosis') || lowerUserMessage.includes('condition') || lowerUserMessage.includes('what is wrong')) {
      const diagnosisMatch = documentText.match(/(?:diagnosis|assessment|impression)[:\s]+([^\n]+)/i);
      if (diagnosisMatch) {
        response = `According to the medical assessment section, the diagnosis appears to be ${diagnosisMatch[1].trim()}.`;
        references.push(createReference(diagnosisMatch[0], "Diagnosis/Assessment", 0.9));
        return { response, references };
      }
      response = "I couldn't find a clear diagnosis in the document.";
      return { response, references };
    }
    
    if (lowerUserMessage.includes('doctor') || lowerUserMessage.includes('physician') || lowerUserMessage.includes('who referred')) {
      const physicianMatch = documentText.match(/(?:referring physician|doctor)[:\s]+([^\n]+)/i);
      if (physicianMatch) {
        response = `According to section 2, the referring physician is ${physicianMatch[1].trim()}.`;
        references.push(createReference(physicianMatch[0], "Physician Information", 0.92));
        return { response, references };
      }
      response = "I couldn't find information about the referring physician.";
      return { response, references };
    }
    
    if (lowerUserMessage.includes('date') || lowerUserMessage.includes('when')) {
      const dateMatch = documentText.match(/(?:date)[:\s]+([^\n]+)/i);
      if (dateMatch) {
        response = `According to the document header, the date on the document is ${dateMatch[1].trim()}.`;
        references.push(createReference(dateMatch[0], "Document Header", 0.88));
        return { response, references };
      }
      response = "I couldn't find a specific date in the document.";
      return { response, references };
    }
    
    if (lowerUserMessage.includes('summary') || lowerUserMessage.includes('summarize')) {
      response = `This appears to be a medical referral document. It contains patient information, referring physician details, and clinical information including diagnosis and recommended actions. The document is structured as a formal medical referral.`;
      
      // Add a few general references
      const patientSection = documentText.match(/PATIENT INFORMATION([\s\S]*?)(REFERRING|$)/i);
      if (patientSection) {
        references.push(createReference(
          patientSection[0].substring(0, 100) + "...",
          "Patient Information Section",
          0.85
        ));
      }
      
      const physicianSection = documentText.match(/REFERRING[\s\S]*?PHYSICIAN([\s\S]*?)(REASON|CLINICAL|$)/i);
      if (physicianSection) {
        references.push(createReference(
          physicianSection[0].substring(0, 100) + "...",
          "Physician Information Section",
          0.82
        ));
      }
      
      return { response, references };
    }
    
    // Generic response for other queries
    response = "I've analyzed the document but can't provide a specific answer to that question. Please try asking about the patient's name, diagnosis, referring physician, or other specific information that might be contained in a medical referral.";
    return { response, references };
  }
  
  /**
   * Get all messages for a specific document
   */
  getMessages(documentId) {
    const session = this.getChatSession(documentId);
    return [...session.messages];
  }
  
  /**
   * Clear chat history for a document
   */
  clearChatHistory(documentId) {
    this.chatSessions.set(documentId, {
      documentId,
      messages: [],
      references: [],
    });
  }
  
  /**
   * Get references for a specific message
   */
  getReferencesForMessage(documentId, messageId) {
    const session = this.getChatSession(documentId);
    const message = session.messages.find(msg => msg.id === messageId);
    
    if (message && message.references) {
      return message.references;
    }
    
    return [];
  }
}

export default ChatService;