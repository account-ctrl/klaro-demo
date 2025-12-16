
import { Timestamp } from 'firebase/firestore';

// --- EXISTING CORE (Preserved) ---
export type StockBatch = {
    batchId: string;
    itemId: string;
    batchNumber: string;
    quantityInBatch: number;
    expiryDate: string; // YYYY-MM-DD
    source?: string;
    dateReceived?: Timestamp;
    status: 'Active' | 'Expired' | 'Consumed';
};

// --- NEW EXTENSIONS FOR INTEGRATION ---

// 1. Resident Reference
export type ResidentRef = {
    residentId: string;
    fullName: string;
    barangayId: string;
};

// 2. Consultation
export type Consultation = {
    consultationId: string;
    residentId: string;
    doctorId: string; // User ID of the health worker
    date: Timestamp;
    complaint: string;
    diagnosis?: string;
    vitals?: {
        bp?: string;
        temp?: number;
        weight?: number;
        height?: number;
        oxygenSaturation?: number;
    };
    notes?: string;
    createdAt?: Timestamp;
};

// 3. Prescription
export type PrescriptionItem = {
    itemId: string;
    itemName: string; // Denormalized for display
    quantityPrescribed: number;
    dosageInstructions?: string; // e.g. "1 tab every 4 hours"
    quantityDispensed?: number; // Track partial dispensing
};

export type Prescription = {
    prescriptionId: string;
    consultationId: string;
    residentId: string; // Denormalized for querying
    doctorId: string;
    items: PrescriptionItem[];
    status: 'Pending' | 'Partially Dispensed' | 'Completed' | 'Cancelled';
    createdAt: Timestamp;
    updatedAt?: Timestamp;
};

// 4. Dispense Transaction (The "Golden Record" for Audit)
export type DispenseTransaction = {
    transactionId: string;
    residentId: string;
    consultationId: string;
    prescriptionId: string;
    
    itemId: string;
    itemName: string;
    
    batchId: string; // Exact trace to the box
    batchNumber: string; // Traceability for recalls
    
    quantityDispensed: number;
    dispensedAt: Timestamp;
    dispensedBy: string; // Health worker ID
    
    notes?: string;
};

// 5. Medical Item (The Parent Product)
export type MedicalItem = {
    itemId: string;
    name: string; // e.g. "Paracetamol 500mg"
    genericName?: string;
    category: 'Medicine' | 'Supply' | 'Equipment';
    unit: string; // e.g. "Tablet", "Box", "Bottle"
    description?: string;
    
    // Aggregates (Optimistic UI support)
    totalStock: number; 
    
    // Thresholds for alerts
    lowStockThreshold: number;
    
    createdAt: Timestamp;
    updatedAt: Timestamp;
};
