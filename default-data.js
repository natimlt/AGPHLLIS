/**
 * ======================================================
 * AGPHL LIS - Default Data
 * Version: 1.0
 * Developer: Asrat Genet
 * 
 * Default data for initial system setup.
 * ======================================================
 */

const DefaultData = {
  // Default system settings
  settings: {
    hospitalName: 'Agew Gimjabet Primary Hospital',
    hospitalAddress: 'Agew Gimjabet, Ethiopia',
    hospitalPhone: '+251-900-000-000',
    hospitalEmail: 'info@agphl.com',
    laboratoryName: 'AGPHL Laboratory',
    laboratoryCode: 'AGPHL-001',
    theme: 'light',
    language: 'en',
    currency: 'ETB',
    timezone: 'Africa/Addis_Ababa',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm'
  },
  
  // Default departments
  departments: [
    'Hematology',
    'Clinical Chemistry',
    'Microbiology',
    'Blood Bank',
    'Serology',
    'Parasitology',
    'Urinalysis',
    'Immunology',
    'Molecular Biology',
    'Histopathology'
  ],
  
  // Default test categories
  testCategories: {
    'Hematology': [
      'Complete Blood Count',
      'Hemoglobin',
      'WBC Count',
      'Platelet Count',
      'PT/INR',
      'APTT'
    ],
    'Clinical Chemistry': [
      'Fasting Blood Sugar',
      'Random Blood Sugar',
      'Liver Function Test',
      'Kidney Function Test',
      'Lipid Profile',
      'Electrolytes'
    ],
    'Microbiology': [
      'Gram Stain',
      'Culture and Sensitivity',
      'AFB',
      'Blood Culture',
      'Urine Culture'
    ],
    'Blood Bank': [
      'Blood Grouping',
      'Cross Matching',
      'Coomb\'s Test',
      'Antibody Screening'
    ],
    'Serology': [
      'HIV',
      'Hepatitis B',
      'Hepatitis C',
      'Syphilis',
      'Widal Test',
      'Rheumatoid Factor'
    ],
    'Parasitology': [
      'Stool Ova and Parasite',
      'Malaria',
      'Filariasis',
      'Leishmania'
    ],
    'Urinalysis': [
      'Routine Urinalysis',
      'Urine Microscopy',
      'Urine Culture'
    ]
  },
  
  // Default specimen types
  specimenTypes: [
    'Blood',
    'Serum',
    'Plasma',
    'Urine',
    'Stool',
    'CSF',
    'Sputum',
    'Swab',
    'Tissue',
    'Body Fluid'
  ],
  
  // Default priority levels
  priorities: [
    'Routine',
    'Urgent',
    'Stat',
    'ASAP'
  ],
  
  // Default sample statuses
  sampleStatuses: [
    'Registered',
    'Collected',
    'In Transit',
    'Received',
    'Processing',
    'Completed',
    'Verified',
    'Rejected',
    'Cancelled'
  ],
  
  // Default equipment
  equipment: [
    'Hematology Analyzer',
    'Chemistry Analyzer',
    'Coagulation Analyzer',
    'Blood Gas Analyzer',
    'Microscope',
    'Centrifuge',
    'Refrigerator',
    'Incubator',
    'Biosafety Cabinet',
    'Water Bath'
  ],
  
  // Default quality indicators
  qualityIndicators: [
    'Sample Rejection Rate',
    'Turnaround Time',
    'Critical Value Reporting',
    'Repeat Testing Rate',
    'External Quality Assessment'
  ],

  // ISO 15189:2022 aligned Quality Indicator definitions
  // target: the goal value; direction: 'lower' = lower is better, 'higher' = higher is better
  qiDefinitions: [
    { code: 'QI-01', name: 'Sample Rejection Rate', category: 'Pre-analytical', unit: '%', target: 2, direction: 'lower' },
    { code: 'QI-02', name: 'Mislabeled Sample Rate', category: 'Pre-analytical', unit: '%', target: 0.5, direction: 'lower' },
    { code: 'QI-03', name: 'TAT Compliance (Routine)', category: 'Post-analytical', unit: '%', target: 90, direction: 'higher' },
    { code: 'QI-04', name: 'TAT Compliance (Stat/Urgent)', category: 'Post-analytical', unit: '%', target: 95, direction: 'higher' },
    { code: 'QI-05', name: 'Critical Value Notification Time', category: 'Post-analytical', unit: 'minutes', target: 30, direction: 'lower' },
    { code: 'QI-06', name: 'Critical Value Notification Compliance', category: 'Post-analytical', unit: '%', target: 100, direction: 'higher' },
    { code: 'QI-07', name: 'Internal QC Failure Rate (Westgard)', category: 'Analytical', unit: '%', target: 5, direction: 'lower' },
    { code: 'QI-08', name: 'EQA/PT Acceptable Performance Rate', category: 'Analytical', unit: '%', target: 95, direction: 'higher' },
    { code: 'QI-09', name: 'Repeat/Re-test Rate', category: 'Analytical', unit: '%', target: 3, direction: 'lower' },
    { code: 'QI-10', name: 'Equipment Downtime', category: 'Analytical', unit: 'hours/month', target: 8, direction: 'lower' },
    { code: 'QI-11', name: 'Test Availability Rate', category: 'Pre-analytical', unit: '%', target: 98, direction: 'higher' },
    { code: 'QI-12', name: 'Customer/Clinician Complaint Rate', category: 'Post-analytical', unit: 'per 1000 results', target: 2, direction: 'lower' },
    { code: 'QI-13', name: 'Incident/Non-Conformance Rate', category: 'General', unit: 'per month', target: 5, direction: 'lower' },
    { code: 'QI-14', name: 'CAPA Closure Rate (within 30 days)', category: 'General', unit: '%', target: 90, direction: 'higher' },
    { code: 'QI-15', name: 'Staff Competency Assessment Completion', category: 'General', unit: '%', target: 100, direction: 'higher' }
  ],

  // Default test catalog with target TAT (minutes) - used by Test Availability & TAT Monitoring modules
  testCatalog: [
    { testName: 'Complete Blood Count', department: 'Hematology', specimenType: 'Blood', targetTAT: 60, criticalTest: true },
    { testName: 'Hemoglobin', department: 'Hematology', specimenType: 'Blood', targetTAT: 30, criticalTest: false },
    { testName: 'WBC Count', department: 'Hematology', specimenType: 'Blood', targetTAT: 30, criticalTest: false },
    { testName: 'Platelet Count', department: 'Hematology', specimenType: 'Blood', targetTAT: 30, criticalTest: true },
    { testName: 'PT/INR', department: 'Hematology', specimenType: 'Blood', targetTAT: 60, criticalTest: true },
    { testName: 'APTT', department: 'Hematology', specimenType: 'Blood', targetTAT: 60, criticalTest: true },
    { testName: 'Fasting Blood Sugar', department: 'Clinical Chemistry', specimenType: 'Serum', targetTAT: 45, criticalTest: true },
    { testName: 'Random Blood Sugar', department: 'Clinical Chemistry', specimenType: 'Serum', targetTAT: 45, criticalTest: true },
    { testName: 'Liver Function Test', department: 'Clinical Chemistry', specimenType: 'Serum', targetTAT: 120, criticalTest: false },
    { testName: 'Kidney Function Test', department: 'Clinical Chemistry', specimenType: 'Serum', targetTAT: 120, criticalTest: true },
    { testName: 'Lipid Profile', department: 'Clinical Chemistry', specimenType: 'Serum', targetTAT: 120, criticalTest: false },
    { testName: 'Electrolytes', department: 'Clinical Chemistry', specimenType: 'Serum', targetTAT: 60, criticalTest: true },
    { testName: 'Gram Stain', department: 'Microbiology', specimenType: 'Swab', targetTAT: 60, criticalTest: false },
    { testName: 'Culture and Sensitivity', department: 'Microbiology', specimenType: 'Swab', targetTAT: 4320, criticalTest: false },
    { testName: 'AFB', department: 'Microbiology', specimenType: 'Sputum', targetTAT: 1440, criticalTest: false },
    { testName: 'Blood Culture', department: 'Microbiology', specimenType: 'Blood', targetTAT: 4320, criticalTest: true },
    { testName: 'Urine Culture', department: 'Microbiology', specimenType: 'Urine', targetTAT: 2880, criticalTest: false },
    { testName: 'Blood Grouping', department: 'Blood Bank', specimenType: 'Blood', targetTAT: 30, criticalTest: true },
    { testName: 'Cross Matching', department: 'Blood Bank', specimenType: 'Blood', targetTAT: 60, criticalTest: true },
    { testName: 'Coomb\'s Test', department: 'Blood Bank', specimenType: 'Blood', targetTAT: 60, criticalTest: false },
    { testName: 'Antibody Screening', department: 'Blood Bank', specimenType: 'Blood', targetTAT: 90, criticalTest: false },
    { testName: 'HIV', department: 'Serology', specimenType: 'Serum', targetTAT: 60, criticalTest: true },
    { testName: 'Hepatitis B', department: 'Serology', specimenType: 'Serum', targetTAT: 60, criticalTest: false },
    { testName: 'Hepatitis C', department: 'Serology', specimenType: 'Serum', targetTAT: 60, criticalTest: false },
    { testName: 'Syphilis', department: 'Serology', specimenType: 'Serum', targetTAT: 60, criticalTest: false },
    { testName: 'Widal Test', department: 'Serology', specimenType: 'Serum', targetTAT: 60, criticalTest: false },
    { testName: 'Rheumatoid Factor', department: 'Serology', specimenType: 'Serum', targetTAT: 60, criticalTest: false },
    { testName: 'Stool Ova and Parasite', department: 'Parasitology', specimenType: 'Stool', targetTAT: 60, criticalTest: false },
    { testName: 'Malaria', department: 'Parasitology', specimenType: 'Blood', targetTAT: 30, criticalTest: true },
    { testName: 'Filariasis', department: 'Parasitology', specimenType: 'Blood', targetTAT: 60, criticalTest: false },
    { testName: 'Leishmania', department: 'Parasitology', specimenType: 'Blood', targetTAT: 60, criticalTest: false },
    { testName: 'Routine Urinalysis', department: 'Urinalysis', specimenType: 'Urine', targetTAT: 30, criticalTest: false },
    { testName: 'Urine Microscopy', department: 'Urinalysis', specimenType: 'Urine', targetTAT: 30, criticalTest: false }
  ]
};

// Initialize default data if not exists
document.addEventListener('DOMContentLoaded', function() {
  const storage = window.storage;
  if (!storage) return;
  
  // Check if settings exist
  if (!storage.getById('settings', 'system')) {
    storage.create('settings', {
      id: 'system',
      ...DefaultData.settings,
      createdAt: new Date().toISOString()
    });
  }
  
  // Initialize departments
  const departments = storage.getAll('departments');
  if (departments.length === 0) {
    for (const dept of DefaultData.departments) {
      storage.create('departments', {
        name: dept,
        description: `${dept} Department`,
        status: 'active'
      });
    }
  }
  
  // Initialize specimen types
  const specimenTypes = storage.getAll('specimenTypes');
  if (specimenTypes.length === 0) {
    for (const type of DefaultData.specimenTypes) {
      storage.create('specimenTypes', {
        name: type,
        status: 'active'
      });
    }
  }
  
  // Initialize priorities
  const priorities = storage.getAll('priorities');
  if (priorities.length === 0) {
    for (const priority of DefaultData.priorities) {
      storage.create('priorities', {
        name: priority,
        level: DefaultData.priorities.indexOf(priority) + 1,
        status: 'active'
      });
    }
  }
  
  // Initialize sample statuses
  const statuses = storage.getAll('sampleStatuses');
  if (statuses.length === 0) {
    for (const status of DefaultData.sampleStatuses) {
      storage.create('sampleStatuses', {
        name: status,
        color: Utils.getStatusColor(status),
        status: 'active'
      });
    }
  }
  
  // Initialize equipment
  const equipment = storage.getAll('equipment');
  if (equipment.length === 0) {
    for (const item of DefaultData.equipment) {
      storage.create('equipment', {
        name: item,
        serialNumber: `EQ-${Utils.generateId(8)}`,
        status: 'Operational',
        department: 'General'
      });
    }
  }

  // Initialize test catalog (Test Availability & TAT Monitoring)
  const testCatalog = storage.getAll('testCatalog');
  if (testCatalog.length === 0) {
    for (const test of DefaultData.testCatalog) {
      storage.create('testCatalog', {
        ...test,
        status: 'Available',
        reason: '',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      });
    }
  }

  // Initialize ISO 15189:2022 Quality Indicator definitions
  const qiDefs = storage.getAll('qiDefinitions');
  if (qiDefs.length === 0) {
    for (const qi of DefaultData.qiDefinitions) {
      storage.create('qiDefinitions', {
        ...qi,
        active: true
      });
    }
  }
});

// Make default data available globally
window.DefaultData = DefaultData;