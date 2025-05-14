/**
 * Document Reference Service for tracking sources of information in documents
 * This service helps identify and track the origins of extracted information
 * Used for providing source references in AI responses
 */
class DocumentReferenceService {
  static instance;
  
  constructor() {
    this.documentReferences = new Map();
    this.paragraphCache = new Map();
  }
  
  static getInstance() {
    if (!DocumentReferenceService.instance) {
      DocumentReferenceService.instance = new DocumentReferenceService();
    }
    return DocumentReferenceService.instance;
  }
  
  /**
   * Process a document and create reference metadata
   * @param {string} documentId - Unique ID of the document
   * @param {string} documentText - Full text of the document
   * @returns {Object} Reference metadata
   */
  processDocument(documentId, documentText) {
    // Split document into paragraphs/sections
    const paragraphs = this.splitIntoParagraphs(documentText);
    
    // Create reference metadata
    const referenceData = {
      documentId,
      totalParagraphs: paragraphs.length,
      paragraphs: paragraphs.map((text, index) => ({
        id: `p-${index}`,
        text,
        index,
        // Try to determine section type
        type: this.determineSectionType(text),
        // Calculate start and end position in the original text
        position: {
          start: documentText.indexOf(text),
          end: documentText.indexOf(text) + text.length
        }
      }))
    };
    
    // Store in cache
    this.documentReferences.set(documentId, referenceData);
    this.paragraphCache.set(documentId, paragraphs);
    
    return referenceData;
  }
  
  /**
   * Split document text into meaningful paragraphs or sections
   * @param {string} text - Document text
   * @returns {Array} Array of paragraph texts
   */
  splitIntoParagraphs(text) {
    // First try to split by double newlines (paragraphs)
    let paragraphs = text.split(/\n\s*\n/);
    
    // If that gives us too few or too many sections, try different approaches
    if (paragraphs.length <= 1) {
      // Try single newlines
      paragraphs = text.split(/\n/);
    } else if (paragraphs.length > 30) {
      // Too many paragraphs, try to merge some
      const mergedParagraphs = [];
      let currentSection = '';
      
      for (const para of paragraphs) {
        // If paragraph is very short, merge with previous
        if (para.length < 20 && currentSection) {
          currentSection += '\n\n' + para;
        } else if (currentSection) {
          mergedParagraphs.push(currentSection);
          currentSection = para;
        } else {
          currentSection = para;
        }
      }
      
      if (currentSection) {
        mergedParagraphs.push(currentSection);
      }
      
      paragraphs = mergedParagraphs;
    }
    
    // Filter out empty paragraphs and trim
    return paragraphs
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
  
  /**
   * Try to determine what type of section this is
   * @param {string} text - Paragraph or section text
   * @returns {string} Section type
   */
  determineSectionType(text) {
    const lowerText = text.toLowerCase();
    
    // Check for common section headers
    if (lowerText.includes('patient') && (lowerText.includes('information') || lowerText.includes('details'))) {
      return 'Patient Information';
    }
    
    if (lowerText.includes('referring') && (lowerText.includes('physician') || lowerText.includes('doctor'))) {
      return 'Referring Physician';
    }
    
    if (lowerText.includes('diagnosis') || lowerText.includes('assessment') || lowerText.includes('impression')) {
      return 'Diagnosis';
    }
    
    if (lowerText.includes('history')) {
      return 'Medical History';
    }
    
    if (lowerText.includes('medication') || lowerText.includes('prescription')) {
      return 'Medications';
    }
    
    if (lowerText.includes('lab') || lowerText.includes('test') || lowerText.includes('result')) {
      return 'Lab Results';
    }
    
    if (lowerText.includes('reason') && lowerText.includes('referral')) {
      return 'Referral Reason';
    }
    
    // Default section type
    return 'General';
  }
  
  /**
   * Find the most relevant sections of a document for a query
   * @param {string} documentText - Full document text
   * @param {string} query - User query
   * @param {number} maxSections - Maximum number of sections to return
   * @returns {Array} Relevant sections with reference info
   */
  async findRelevantSections(documentText, query, maxSections = 3) {
    // Split the document if not already processed
    const paragraphs = this.splitIntoParagraphs(documentText);
    
    // Simple approach: score each paragraph based on keyword matches
    const scoredParagraphs = paragraphs.map((text, index) => {
      const score = this.calculateRelevanceScore(text, query);
      return {
        text,
        index,
        score,
        location: this.determineSectionType(text)
      };
    });
    
    // Sort by relevance score and take top sections
    const relevantSections = scoredParagraphs
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSections)
      .filter(section => section.score > 0.1); // Filter out low relevance
    
    return relevantSections;
  }
  
  /**
   * Calculate a relevance score between section text and a query
   * This is a simple keyword-based approach
   * @param {string} text - Section text
   * @param {string} query - User query
   * @returns {number} Relevance score (0-1)
   */
  calculateRelevanceScore(text, query) {
    // Convert to lowercase for comparison
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Extract keywords from query
    const queryWords = lowerQuery
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['what', 'when', 'where', 'which', 'who', 'how', 'is', 'are', 'the', 'this', 'that'].includes(word));
    
    if (queryWords.length === 0) {
      return 0;
    }
    
    // Count matching words
    let matchCount = 0;
    for (const word of queryWords) {
      if (lowerText.includes(word)) {
        matchCount++;
      }
    }
    
    // Calculate score
    const score = matchCount / queryWords.length;
    
    // Boost score if the section contains any exact phrases from the query
    const threeOrMoreWords = queryWords.length >= 3;
    if (threeOrMoreWords && lowerText.includes(lowerQuery)) {
      return Math.min(score + 0.5, 1.0); // Boost but cap at 1.0
    }
    
    return score;
  }
  
  /**
   * Get references for a document
   * @param {string} documentId - Document ID
   * @returns {Object|null} Reference data or null if not found
   */
  getDocumentReferences(documentId) {
    return this.documentReferences.get(documentId) || null;
  }
  
  /**
   * Highlight reference in document text
   * @param {string} documentText - Full document text
   * @param {Array} references - References to highlight
   * @returns {string} Document text with highlights
   */
  highlightReferences(documentText, references) {
    // Sort references by position in reverse order (to avoid offset issues)
    const sortedRefs = [...references]
      .filter(ref => ref.position)
      .sort((a, b) => b.position.start - a.position.start);
    
    let highlightedText = documentText;
    
    // Insert highlight markers
    for (const ref of sortedRefs) {
      const { start, end } = ref.position;
      const beforeText = highlightedText.substring(0, start);
      const refText = highlightedText.substring(start, end);
      const afterText = highlightedText.substring(end);
      
      highlightedText = `${beforeText}<<HIGHLIGHT>>${refText}<</HIGHLIGHT>>${afterText}`;
    }
    
    return highlightedText;
  }
}

export default DocumentReferenceService;