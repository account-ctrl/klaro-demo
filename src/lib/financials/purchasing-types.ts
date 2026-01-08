
import { Timestamp } from 'firebase/firestore';

export interface Vendor {
    id: string;
    name: string;
    address: string;
    tin?: string;
    contactPerson?: string;
    contactNumber?: string;
    email?: string;
    category?: string; // e.g., 'Construction', 'Office Supplies'
    createdAt: Timestamp;
}

export interface CatalogItem {
    id: string;
    name: string;
    description?: string;
    unit: string; // e.g., 'pc', 'box', 'roll'
    unitCost: number;
    category?: string;
}

export interface POItem {
    itemId?: string; // Optional link to catalog
    description: string; // Printable description
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number; // quantity * unitCost
}

export type POStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED' | 'CANCELLED';

export interface PurchaseOrder {
    id: string;
    poNumber: string; // Auto-generated: PO-2024-001
    date: Timestamp;
    
    vendorId: string;
    vendorName: string;
    vendorAddress: string;
    
    items: POItem[];
    totalAmount: number;
    
    status: POStatus;
    
    // Workflow
    preparedBy: string; // User ID
    approvedBy?: string;
    
    notes?: string;
    createdAt: Timestamp;
}
