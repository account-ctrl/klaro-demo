
import { Timestamp } from 'firebase/firestore';

// 1. Fiscal Year
// Controls the accounting period.
export interface FiscalYear {
  id: string; // e.g., "2024"
  status: 'active' | 'closed' | 'preparing';
  startDate: Timestamp;
  endDate: Timestamp;
  createdBy: string;
}

// 2. Appropriations (The Source)
// e.g., "General Fund 2024", "SK Fund"
export interface Appropriation {
  id: string;
  fiscalYearId: string; // Link to "2024"
  sourceName: string;   // e.g., "Internal Revenue Allotment (IRA)"
  totalAmount: number;  // The approved budget ceiling
  status: 'Proposed' | 'Approved';
  approvalDate?: Timestamp;
  approvedBy?: string; // Sangguniang Barangay Resolution Ref
}

// 3. Allotments (The Bucket)
// Breakdown of Appropriations into expense classes.
// NOTE: 'currentBalance' is denormalized for read performance.
export interface Allotment {
  id: string;
  appropriationId: string; 
  class: 'Personal Services' | 'MOOE' | 'Capital Outlay' | 'Non-Office';
  description: string; // e.g., "Peace and Order Program"
  accountCode?: string; // Standard Government Chart of Accounts code
  totalAmount: number;   // The slice of the pie given to this bucket
  currentBalance: number; // calculated: totalAmount - sum(obligations)
  lastUpdated: Timestamp;
}

// 4. Obligations (The Reservation - OBR)
// A specific commitment to pay a supplier or individual.
export interface Obligation {
  id: string;
  allotmentId: string; // The bucket we are taking money from
  referenceCode: string; // e.g., "OBR-2024-001"
  payee: string;
  purpose: string;
  amount: number;
  status: 'Pending' | 'Certified' | 'Disbursed' | 'Cancelled';
  
  // Linkage
  dvId?: string; // Link to existing DisbursementVoucher system if generated
  
  // Audit
  createdBy: string; // User ID
  createdAt: Timestamp;
  certifiedBy?: string; // Treasurer ID
  certifiedAt?: Timestamp;
}

// 5. Transactions (The Release)
// Sub-collection inside Obligations
export interface TransactionLog {
  id: string;
  type: 'Obligation Created' | 'Check Released' | 'Cash Released';
  amount: number;
  performedBy: string;
  timestamp: Timestamp;
  notes?: string;
}
