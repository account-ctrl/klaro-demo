
import { Timestamp } from 'firebase/firestore';

export type BudgetType = 'ANNUAL' | 'SUPPLEMENTAL';
export type ProposalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type ExpenseClass = 'PS' | 'MOOE' | 'CO' | 'FE';

export interface IncomeSource {
    id: string; // generated UUID
    code: string; // e.g. 'IRA', 'RPT'
    name: string;
    amount: number;
}

export interface ExpenseAllocation {
    id: string; // generated UUID
    class: ExpenseClass;
    name: string;
    accountCode: string; // e.g. '5-02-03-010'
    amount: number;
}

export interface BudgetProposal {
    id: string;
    fiscalYear: string; // "2024"
    type: BudgetType;
    status: ProposalStatus;
    
    totalIncome: number;
    totalExpense: number;
    
    incomeSources: IncomeSource[];
    expenseAllocations: ExpenseAllocation[];
    
    createdBy: string;
    createdAt: Timestamp;
    approvedBy?: string;
    approvedAt?: Timestamp;
    
    // Audit logs embedded
    logs: Array<{
        user: string;
        action: string;
        timestamp: Timestamp;
    }>;
}

// Validation Result Interface
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
