/**
 * Enhanced section type system using numeric identifiers
 * This provides more consistent typing for document sections
 */

// Define section type enum with numeric IDs
const SectionType = {
  UNKNOWN: 0,
  PATIENT_INFO: 1,
  INSURANCE: 2,
  DIAGNOSIS: 3,
  PROVIDER: 4,
  MEDICATIONS: 5,
  HISTORY: 6,
  PHYSICAL_EXAM: 7,
  LABS: 8,
  DISCHARGE: 9,
  MENTAL_STATUS: 10,
  TREATMENT: 11,
  REFERRAL: 12,
  VITALS: 13,
  ALLERGIES: 14,
  PROCEDURES: 15,
  ASSESSMENT: 16,
  PLAN: 17,
  NOTES: 18,
  
  // Get display name for a section type ID
  getName: function(typeId) {
    const names = {
      0: 'Unknown Section',
      1: 'Patient Information',
      2: 'Insurance Information',
      3: 'Diagnosis',
      4: 'Provider Information',
      5: 'Medications',
      6: 'Medical History',
      7: 'Physical Examination',
      8: 'Laboratory Results',
      9: 'Discharge Information',
      10: 'Mental Status',
      11: 'Treatment Plan',
      12: 'Referral Information',
      13: 'Vital Signs',
      14: 'Allergies',
      15: 'Procedures',
      16: 'Assessment',
      17: 'Plan',
      18: 'Additional Notes'
    };
    
    return names[typeId] || 'Unknown Section';
  },
  
  // Get section type ID from text by analyzing keywords
  fromText: function(text) {
    if (!text) return this.UNKNOWN;
    
    const lowerText = text.toLowerCase();
    
    // Map keywords to section types
    const typeMatchers = [
      { type: this.PATIENT_INFO, keywords: ['patient', 'name', 'dob', 'date of birth', 'demographics', 'personal', 'address', 'contact'] },
      { type: this.INSURANCE, keywords: ['insurance', 'coverage', 'policy', 'payer', 'financial', 'copay', 'deductible', 'plan'] },
      { type: this.DIAGNOSIS, keywords: ['diagnosis', 'dx', 'impression', 'problem', 'condition', 'icd'] },
      { type: this.PROVIDER, keywords: ['provider', 'physician', 'doctor', 'pcp', 'attending', 'consultant', 'referring'] },
      { type: this.MEDICATIONS, keywords: ['medication', 'med', 'prescription', 'drug', 'dose', 'route', 'frequency', 'antibiotic', 'cardiac'] },
      { type: this.HISTORY, keywords: ['history', 'hx', 'past medical', 'pmh', 'previous', 'family history'] },
      { type: this.PHYSICAL_EXAM, keywords: ['examination', 'exam', 'physical', 'findings', 'wound', 'inspection'] },
      { type: this.LABS, keywords: ['laboratory', 'lab', 'test', 'results', 'values', 'blood work', 'cbc', 'chemistry'] },
      { type: this.DISCHARGE, keywords: ['discharge', 'dc', 'disposition', 'follow-up', 'follow up', 'discharged'] },
      { type: this.MENTAL_STATUS, keywords: ['mental', 'psychiatric', 'psychological', 'cognitive', 'mood', 'behavior', 'mental status'] },
      { type: this.TREATMENT, keywords: ['treatment', 'intervention', 'therapy', 'regimen', 'protocol'] },
      { type: this.REFERRAL, keywords: ['referral', 'refer', 'consult', 'consultation'] },
      { type: this.VITALS, keywords: ['vitals', 'vital signs', 'bp', 'blood pressure', 'pulse', 'temperature', 'resp'] },
      { type: this.ALLERGIES, keywords: ['allerg', 'reaction', 'sensitivity', 'intolerance'] },
      { type: this.PROCEDURES, keywords: ['procedure', 'surgery', 'operation', 'intervention'] },
      { type: this.ASSESSMENT, keywords: ['assessment', 'impression', 'evaluation'] },
      { type: this.PLAN, keywords: ['plan', 'recommendation', 'proposed', 'next steps'] },
      { type: this.NOTES, keywords: ['note', 'comment', 'additional', 'other', 'remark'] }
    ];
    
    // Check for section headers
    const headerMatch = /^(.{0,50}):/i.exec(text);
    if (headerMatch) {
      const header = headerMatch[1].toLowerCase();
      
      // Check each type matcher with the header
      for (const matcher of typeMatchers) {
        for (const keyword of matcher.keywords) {
          if (header.includes(keyword)) {
            return matcher.type;
          }
        }
      }
    }
    
    // If no header match, check full text content
    // Count keyword occurrences for each type
    const typeCounts = typeMatchers.map(matcher => {
      let count = 0;
      for (const keyword of matcher.keywords) {
        const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
          count += matches.length;
        }
      }
      return { type: matcher.type, count };
    });
    
    // Find type with most keyword matches
    typeCounts.sort((a, b) => b.count - a.count);
    
    // Return type with highest count if it has at least 2 matches
    if (typeCounts.length > 0 && typeCounts[0].count >= 2) {
      return typeCounts[0].type;
    }
    
    // Fall back to Unknown
    return this.UNKNOWN;
  },
  
  // Get related section types (for searching related sections)
  getRelatedTypes: function(typeId) {
    const relationMap = {
      [this.PATIENT_INFO]: [this.PATIENT_INFO, this.INSURANCE],
      [this.INSURANCE]: [this.INSURANCE, this.PATIENT_INFO],
      [this.DIAGNOSIS]: [this.DIAGNOSIS, this.ASSESSMENT, this.PLAN],
      [this.PROVIDER]: [this.PROVIDER, this.REFERRAL],
      [this.MEDICATIONS]: [this.MEDICATIONS, this.TREATMENT, this.PLAN],
      [this.HISTORY]: [this.HISTORY, this.PATIENT_INFO],
      [this.PHYSICAL_EXAM]: [this.PHYSICAL_EXAM, this.ASSESSMENT, this.VITALS],
      [this.LABS]: [this.LABS, this.DIAGNOSIS, this.ASSESSMENT],
      [this.DISCHARGE]: [this.DISCHARGE, this.PLAN, this.TREATMENT],
      [this.MENTAL_STATUS]: [this.MENTAL_STATUS, this.ASSESSMENT],
      [this.TREATMENT]: [this.TREATMENT, this.PLAN, this.MEDICATIONS],
      [this.REFERRAL]: [this.REFERRAL, this.PROVIDER, this.DIAGNOSIS],
      [this.VITALS]: [this.VITALS, this.PHYSICAL_EXAM],
      [this.ALLERGIES]: [this.ALLERGIES, this.PATIENT_INFO, this.HISTORY],
      [this.PROCEDURES]: [this.PROCEDURES, this.TREATMENT, this.PLAN],
      [this.ASSESSMENT]: [this.ASSESSMENT, this.DIAGNOSIS, this.PLAN],
      [this.PLAN]: [this.PLAN, this.TREATMENT, this.DISCHARGE],
      [this.NOTES]: [this.NOTES, this.ASSESSMENT, this.PLAN]
    };
    
    return relationMap[typeId] || [this.UNKNOWN];
  }
};

// Map field names to relevant section types (using numeric IDs)
const FieldSectionMapping = {
  patientName: [SectionType.PATIENT_INFO],
  patientDOB: [SectionType.PATIENT_INFO],
  insurance: [SectionType.INSURANCE, SectionType.PATIENT_INFO],
  location: [SectionType.PATIENT_INFO, SectionType.DISCHARGE, SectionType.REFERRAL],
  dx: [SectionType.DIAGNOSIS, SectionType.ASSESSMENT],
  pcp: [SectionType.PROVIDER, SectionType.REFERRAL],
  dc: [SectionType.DISCHARGE, SectionType.PLAN],
  wounds: [SectionType.PHYSICAL_EXAM, SectionType.ASSESSMENT],
  antibiotics: [SectionType.MEDICATIONS, SectionType.TREATMENT],
  cardiacDrips: [SectionType.MEDICATIONS, SectionType.TREATMENT],
  labs: [SectionType.LABS, SectionType.ASSESSMENT],
  faceToFace: [SectionType.ASSESSMENT, SectionType.NOTES],
  history: [SectionType.HISTORY, SectionType.PATIENT_INFO],
  mentalHealthState: [SectionType.MENTAL_STATUS, SectionType.ASSESSMENT],
  additionalComments: [SectionType.NOTES, SectionType.ASSESSMENT, SectionType.PLAN]
};

// Function to get related section type IDs for a field
function getRelatedSectionTypesForField(fieldName) {
  if (!FieldSectionMapping[fieldName]) {
    return [SectionType.UNKNOWN];
  }
  
  // Start with the directly mapped types
  const directTypes = FieldSectionMapping[fieldName];
  
  // Add related types for each direct type
  const allRelatedTypes = new Set();
  for (const typeId of directTypes) {
    allRelatedTypes.add(typeId);
    
    // Add related types
    const relatedTypes = SectionType.getRelatedTypes(typeId);
    for (const relatedTypeId of relatedTypes) {
      allRelatedTypes.add(relatedTypeId);
    }
  }
  
  return Array.from(allRelatedTypes);
}

// Example of using section type in code:
/*
// For section creation:
const section = {
  text: paragraphText,
  typeId: SectionType.fromText(paragraphText),
  get type() { 
    return SectionType.getName(this.typeId);
  }
};

// For field matching:
const relevantTypeIds = getRelatedSectionTypesForField(fieldName);
const isRelevantSection = relevantTypeIds.includes(section.typeId);
*/
