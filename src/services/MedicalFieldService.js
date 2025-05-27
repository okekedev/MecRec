/**
 * MedicalFieldService.js - Simple field definitions and basic operations
 * Only handles field structure - no UI, validation, or AI concerns
 */

class MedicalFieldService {
  static instance;
  
  constructor() {
    // Simple field definitions - just what we need
    this.fieldDefinitions = [
      { key: 'patientName', number: 1, label: 'Patient Name' },
      { key: 'patientDOB', number: 2, label: 'Date of Birth' },
      { key: 'insurance', number: 3, label: 'Insurance Information' },
      { key: 'location', number: 4, label: 'Location/Facility' },
      { key: 'dx', number: 5, label: 'Diagnosis (Dx)' },
      { key: 'pcp', number: 6, label: 'Primary Care Provider (PCP)' },
      { key: 'dc', number: 7, label: 'Discharge (DC)' },
      { key: 'wounds', number: 8, label: 'Wounds/Injuries' },
      { key: 'medications', number: 9, label: 'Medications & Antibiotics' },
      { key: 'cardiacDrips', number: 10, label: 'Cardiac Medications/Drips' },
      { key: 'labsAndVitals', number: 11, label: 'Labs & Vital Signs' },
      { key: 'faceToFace', number: 12, label: 'Face-to-Face Evaluations' },
      { key: 'history', number: 13, label: 'Medical History' },
      { key: 'mentalHealthState', number: 14, label: 'Mental Health State' },
      { key: 'additionalComments', number: 15, label: 'Additional Comments' }
    ];
    
    // Create lookup maps for quick access
    this.fieldsByKey = {};
    this.fieldsByNumber = {};
    this.fieldOrder = [];
    
    this.fieldDefinitions.forEach(field => {
      this.fieldsByKey[field.key] = field;
      this.fieldsByNumber[field.number] = field;
      this.fieldOrder.push(field.key);
    });
  }
  
  static getInstance() {
    if (!MedicalFieldService.instance) {
      MedicalFieldService.instance = new MedicalFieldService();
    }
    return MedicalFieldService.instance;
  }
  
  /**
   * Get field definition by key
   */
  getFieldByKey(key) {
    return this.fieldsByKey[key] || null;
  }
  
  /**
   * Get field definition by number
   */
  getFieldByNumber(number) {
    return this.fieldsByNumber[number] || null;
  }
  
  /**
   * Get the ordered list of field keys
   */
  getFieldOrder() {
    return [...this.fieldOrder];
  }
  
  /**
   * Get numbered label for display (e.g., "1. Patient Name")
   */
  getNumberedLabel(key) {
    const field = this.fieldsByKey[key];
    return field ? `${field.number}. ${field.label}` : key;
  }
  
  /**
   * Get display label without number
   */
  getLabel(key) {
    const field = this.fieldsByKey[key];
    return field ? field.label : key;
  }
  
  /**
   * Initialize empty form data with all fields
   */
  createEmptyFormData() {
    const formData = {
      extractionMethod: 'pending',
      extractionDate: new Date().toISOString(),
    };
    
    this.fieldOrder.forEach(key => {
      formData[key] = '';
    });
    
    return formData;
  }
}

export default MedicalFieldService;