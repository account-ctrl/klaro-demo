
import { Timestamp } from 'firebase/firestore';

export type MedicineItem = {
    itemId: string;
    name: string;
    dosage: string; // e.g. "500mg"
    unit: string; // e.g. "Tablet", "Syrup"
    category?: string; // e.g. "Antibiotic", "Analgesic"
    reorderPoint: number;
    totalStock: number; // Computed sum of batches
    createdAt: Timestamp;
};

export type MedicineBatch = {
    batchId: string;
    itemId: string; // Link to MedicineItem
    itemName: string; // Denormalized for easier display
    batchNumber: string;
    expiryDate: string; // ISO Date string YYYY-MM-DD
    quantity: number;
    status: 'Active' | 'Expired' | 'Depleted';
    source?: string; // Donation/Purchase
    dateReceived?: Timestamp;
    createdAt: Timestamp;
};

export type HealthProfile = {
    profileId: string;
    residentId: string; // Link to Resident
    bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    allergies: string[];
    conditions: string[]; // Chronic conditions
    notes?: string;
    updatedAt: Timestamp;
};

export type DispensingLog = {
    logId: string;
    residentId: string;
    residentName: string; // Denormalized
    itemId: string;
    itemName: string;
    batchId: string;
    batchNumber: string;
    quantity: number;
    dispensedByUserId: string;
    dispensedByUserName: string;
    dateDispensed: Timestamp;
};

// --- NEW TYPES FOR ADVANCED FEATURES ---

// Feature 1: Maternal & Child Health (MCH)
export type GrowthMeasurement = {
    measureId: string;
    weight: number; // kg
    height: number; // cm
    headCircumference?: number; // cm
    computedBMI?: number; // Calculated
    zScoreStatus?: 'Normal' | 'Underweight' | 'Severely Wasted' | 'Overweight' | 'Obese';
    recordedAt: Timestamp;
    recordedBy: string;
};

export type ImmunizationRecord = {
    vaccineId: string;
    vaccineName: string;
    doseNumber: number;
    dueDate: string; // ISO Date
    status: 'Pending' | 'Administered' | 'Missed';
    administeredAt?: Timestamp;
    administeredBy?: string;
};

export type MCHRecord = {
    mchId: string;
    residentId: string;
    motherName?: string;
    bloodType?: string;
    latestNutritionalStatus?: string; // Derived from latest growth measurement
    lastUpdated: Timestamp;
    // Sub-collections are not directly typed here but implied in usage
};

// Feature 2: Disease Surveillance
export type TreatmentLog = {
    logId: string;
    medicineTaken: string;
    observedBy: string;
    takenAt: Timestamp;
    notes?: string;
};

export type EpidemiologyCase = {
    caseId: string;
    residentId: string;
    diseaseName: string; // Dengue, TB, Measles, etc.
    diagnosisDate: Timestamp;
    status: 'Active' | 'Recovered' | 'Deceased';
    purok: string; // Denormalized for heatmap/clustering
    geoLocation?: {
        latitude: number;
        longitude: number;
    };
    createdAt: Timestamp;
};

// Feature 3: Field Vitals
export type HealthVital = {
    vitalId: string;
    systolic: number;
    diastolic: number;
    bloodSugar?: number;
    temperature?: number;
    heartRate?: number;
    oxygenSaturation?: number;
    notes?: string;
    recordedAt: Timestamp;
    recordedBy: string;
};

// Feature 4b: System Alerts
export type SystemAlert = {
    alertId: string;
    type: 'OUTBREAK_WARNING' | 'INVENTORY_EXPIRY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    details?: any; // Flexible payload
    createdAt: Timestamp;
    isResolved: boolean;
};
