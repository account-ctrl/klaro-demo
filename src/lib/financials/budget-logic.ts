
import { 
    doc, 
    collection, 
    runTransaction, 
    serverTimestamp, 
    Timestamp 
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { BudgetProposal, ValidationResult } from './budget-types';

const { firestore: db } = initializeFirebase();

/**
 * Validates the budget proposal against COA rules.
 */
export function validateBudget(proposal: BudgetProposal): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: Balanced Budget (Income >= Expense)
    // COA allows surplus, but never deficit.
    if (proposal.totalExpense > proposal.totalIncome) {
        errors.push(`Deficit detected: Expenses exceed Income by ₱${(proposal.totalExpense - proposal.totalIncome).toLocaleString()}`);
    }

    // Rule 2: 20% Development Fund
    // Logic: If there is an IRA/NTA source, check for 20% alloc to Dev Fund.
    const ntaSource = proposal.incomeSources.find(s => 
        s.name.toLowerCase().includes('internal revenue') || 
        s.name.toLowerCase().includes('national tax') ||
        s.code === 'NTA' || s.code === 'IRA'
    );

    if (ntaSource) {
        const requiredDevFund = ntaSource.amount * 0.20;
        // Search for allocation (loose text match for now, ideally strictly coded)
        const devFundAlloc = proposal.expenseAllocations.find(a => 
            a.name.toLowerCase().includes('development fund') || 
            a.name.toLowerCase().includes('20%')
        );
        
        const allocated = devFundAlloc ? devFundAlloc.amount : 0;
        if (allocated < requiredDevFund) {
            warnings.push(`20% Development Fund Compliance: Allocated ₱${allocated.toLocaleString()}, Target ₱${requiredDevFund.toLocaleString()}`);
        }
    }

    // Rule 3: 5% Calamity Fund (LDRRMF)
    const requiredCalamity = proposal.totalIncome * 0.05;
    const calamityAlloc = proposal.expenseAllocations.find(a => 
        a.name.toLowerCase().includes('calamity') || 
        a.name.toLowerCase().includes('ldrrmf')
    );
    const allocatedCalamity = calamityAlloc ? calamityAlloc.amount : 0;
    
    if (allocatedCalamity < requiredCalamity) {
        warnings.push(`5% LDRRMF Compliance: Allocated ₱${allocatedCalamity.toLocaleString()}, Target ₱${requiredCalamity.toLocaleString()}`);
    }

    // Rule 4: 10% SK Fund
    // Usually 10% of General Fund income
    const requiredSK = proposal.totalIncome * 0.10;
    const skAlloc = proposal.expenseAllocations.find(a => 
        a.name.toLowerCase().includes('sangguniang kabataan') || 
        a.name.toLowerCase().includes('sk fund')
    );
    const allocatedSK = skAlloc ? skAlloc.amount : 0;

    if (allocatedSK < requiredSK) {
         warnings.push(`10% SK Fund Compliance: Allocated ₱${allocatedSK.toLocaleString()}, Target ₱${requiredSK.toLocaleString()}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Saves a proposal draft.
 */
export async function saveBudgetProposal(
    tenantPath: string, 
    proposal: Omit<BudgetProposal, 'logs' | 'createdAt'>, 
    userId: string
) {
    if (!db) throw new Error("Firebase not initialized");

    const proposalRef = doc(collection(db, `${tenantPath}/budget_proposals`));
    // If updating existing, passed ID would be used, but for now assuming new creation logic structure
    // If ID is passed in proposal, use it.
    const ref = proposal.id ? doc(db, `${tenantPath}/budget_proposals`, proposal.id) : proposalRef;

    const data: BudgetProposal = {
        ...proposal,
        id: ref.id,
        createdAt: serverTimestamp() as Timestamp, // or keep existing if update
        logs: [{
            user: userId,
            action: proposal.status === 'DRAFT' ? 'Saved Draft' : 'Submitted for Approval',
            timestamp: Timestamp.now()
        }]
    };
    
    // Recalculate totals just in case
    data.totalIncome = data.incomeSources.reduce((sum, item) => sum + item.amount, 0);
    data.totalExpense = data.expenseAllocations.reduce((sum, item) => sum + item.amount, 0);

    await runTransaction(db, async (transaction) => {
        transaction.set(ref, data, { merge: true });
    });

    return ref.id;
}

/**
 * Approves a budget and merges it into the LIVE Ledgers (Appropriations/Allotments).
 * This acts as the Cloud Function trigger logic but client-side for the prototype.
 */
export async function approveAndActivateBudget(
    tenantPath: string,
    proposalId: string,
    userId: string
) {
    if (!db) throw new Error("Firebase not initialized");
    
    const proposalRef = doc(db, `${tenantPath}/budget_proposals`, proposalId);
    
    await runTransaction(db, async (transaction) => {
        const proposalSnap = await transaction.get(proposalRef);
        if (!proposalSnap.exists()) throw new Error("Proposal not found");
        
        const proposal = proposalSnap.data() as BudgetProposal;
        
        if (proposal.status === 'APPROVED') throw new Error("Already approved");

        // 1. Update Proposal Status
        transaction.update(proposalRef, {
            status: 'APPROVED',
            approvedBy: userId,
            approvedAt: serverTimestamp(),
            logs: [...proposal.logs, { user: userId, action: 'APPROVED', timestamp: Timestamp.now() }]
        });

        // 2. Create/Update Appropriations (Income Sources)
        for (const source of proposal.incomeSources) {
            // Check if existing source exists for this year? 
            // For MVP, we treat each source entry as a unique appropriation record
            const appropRef = doc(collection(db, `${tenantPath}/appropriations`));
            transaction.set(appropRef, {
                id: appropRef.id,
                fiscalYearId: proposal.fiscalYear,
                sourceName: source.name,
                totalAmount: source.amount,
                status: 'Approved',
                approvalDate: serverTimestamp(),
                approvedBy: userId
            });
        }

        // 3. Create/Update Allotments (Expense Allocations) -> "Account Ledgers"
        for (const alloc of proposal.expenseAllocations) {
            // In a real accounting system, we'd check for existing Account Code and increment (if Supplemental)
            // Here we assume we create new buckets or simplistic matching.
            
            // Logic: If ANNUAL, create new. If SUPPLEMENTAL, find match and increment.
            // For prototype: Just create new allotments. Dashboard sums them up.
            
            const allotmentRef = doc(collection(db, `${tenantPath}/allotments`));
            transaction.set(allotmentRef, {
                id: allotmentRef.id,
                appropriationId: 'linked-via-proposal', // Simplified linkage
                class: alloc.class,
                description: alloc.name,
                accountCode: alloc.accountCode,
                totalAmount: alloc.amount,
                currentBalance: alloc.amount, // Initially full amount available
                lastUpdated: serverTimestamp()
            });
        }
    });
}
