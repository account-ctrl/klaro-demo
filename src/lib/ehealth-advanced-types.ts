import { Timestamp } from 'firebase/firestore';

export type MchRecord = {
    mchId: string;
    residentId: string;
    motherName: string;
    bloodType?: string;
    latestNutritionalStatus?: string;
    lastUpdated?: Timestamp;
};

export type GrowthMeasurement = {
    measureId: string;
    mchId: string; // Parent ID
    weight: number;
    height: number;
    headCircumference?: number;
    computedBMI?: number;
    zScoreStatus?: string;
    recordedAt: Timestamp;
    recordedBy: string;
};

export type ImmunizationRecord = {
    vaccineId: string;
    mchId: string; // Parent ID
    vaccineName: string;
    doseNumber: number;
    dueDate: Timestamp;
    status: 'Pending' | 'Administered' | 'Missed';
    administeredAt?: Timestamp;
    administeredBy?: string;
};

export type EpidemiologyCase = {
    caseId: string;
    residentId: string;
    diseaseName: string;
    diagnosisDate: Timestamp;
    status: 'Active' | 'Recovered' | 'Deceased';
    purok: string;
    geoLocation?: {
        latitude: number;
        longitude: number;
    };
};

export type TreatmentLog = {
    logId: string;
    caseId: string; // Parent ID
    medicineTaken: string;
    observedBy: string;
    takenAt: Timestamp;
    notes?: string;
};

export type HealthVital = {
    vitalId: string;
    residentId: string; // Parent Resident ID
    systolic: number;
    diastolic: number;
    bloodSugar?: number;
    temperature?: number;
    heartRate?: number;
    oxygenSaturation?: number;
    recordedAt: Timestamp;
    recordedBy: string;
    notes?: string;
};

export type StockBatch = {
    batchId: string;
    itemId: string; // Parent Item ID
    batchNumber: string;
    quantityInBatch: number;
    expiryDate: string; // ISO Date String YYYY-MM-DD
    source?: string;
    dateReceived?: Timestamp;
    status: 'Active' | 'Expired' | 'Consumed';
};
