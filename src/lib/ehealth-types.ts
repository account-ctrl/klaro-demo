
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
