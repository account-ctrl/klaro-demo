
import { StockBatch } from './ehealth-advanced-types';
import { runTransaction, doc, collection, Firestore, Timestamp, serverTimestamp } from 'firebase/firestore';

export type BatchAllocation = {
    batchId: string;
    quantityToDeduct: number;
    currentExpiry: string;
};

/**
 * FEFO (First Expired, First Out) Allocation Algorithm.
 * Determines which batches to pull stock from, prioritizing earliest expiry.
 * 
 * @param activeBatches List of all 'Active' batches for a specific item.
 * @param quantityNeeded The amount requested to dispense.
 * @returns Object containing the proposed allocations or an error.
 */
export function calculateFefoAllocation(
    activeBatches: StockBatch[], 
    quantityNeeded: number
): { allocations: BatchAllocation[], error?: string } {
    
    // 1. Filter & Sort: Active, Positive Qty, Earliest Expiry First
    // Also exclude expired batches (safety check)
    const today = new Date().toISOString().split('T')[0];
    
    const validBatches = activeBatches
        .filter(b => b.status === 'Active' && b.quantityInBatch > 0 && b.expiryDate >= today)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    // 2. Check Total Availability
    const totalAvailable = validBatches.reduce((sum, b) => sum + b.quantityInBatch, 0);
    if (totalAvailable < quantityNeeded) {
        return { allocations: [], error: `Insufficient valid stock. Needed: ${quantityNeeded}, Available: ${totalAvailable}` };
    }

    const allocations: BatchAllocation[] = [];
    let remaining = quantityNeeded;

    // 3. Iterate and Allocate
    for (const batch of validBatches) {
        if (remaining <= 0) break;

        const takeAmount = Math.min(batch.quantityInBatch, remaining);
        
        allocations.push({
            batchId: batch.batchId,
            quantityToDeduct: takeAmount,
            currentExpiry: batch.expiryDate
        });

        remaining -= takeAmount;
    }

    return { allocations };
}

export type DispenseMetadata = {
    residentId: string;
    consultationId: string;
    userId: string;
    prescriptionId: string;
    itemName: string;
};

/**
 * Executes the dispensing transaction securely in Firestore.
 * Ensures atomicity: Stock deduction and Audit Log creation happen together.
 */
export async function executeDispenseTransaction(
    db: Firestore, 
    barangayId: string, 
    itemId: string, 
    allocations: BatchAllocation[], 
    meta: DispenseMetadata
) {
    if (allocations.length === 0) throw new Error("No allocations provided.");

    await runTransaction(db, async (transaction) => {
        // 1. Reads: Fetch fresh batch data to ensure consistency (Optimistic Locking)
        const batchRefs = allocations.map(a => 
            doc(db, `barangays/${barangayId}/ehealth_inventory/${itemId}/batches/${a.batchId}`)
        );
        const batchSnapshots = await Promise.all(batchRefs.map(ref => transaction.get(ref)));

        // 2. Validation
        batchSnapshots.forEach((snap, index) => {
            if (!snap.exists()) throw new Error(`Batch not found during transaction: ${allocations[index].batchId}`);
            
            const batch = snap.data() as StockBatch;
            const alloc = allocations[index];

            if (batch.status !== 'Active') throw new Error(`Batch ${batch.batchNumber} is not active`);
            if (batch.quantityInBatch < alloc.quantityToDeduct) throw new Error(`Batch ${batch.batchNumber} has insufficient stock (Race condition detected).`);
            
            // Safety: Check expiry again
            const today = new Date().toISOString().split('T')[0];
            if (batch.expiryDate < today) throw new Error(`Batch ${batch.batchNumber} has expired.`);
        });

        // 3. Writes
        const logCollectionRef = collection(db, `barangays/${barangayId}/ehealth_dispensing_log`);
        const itemRef = doc(db, `barangays/${barangayId}/ehealth_inventory/${itemId}`);

        allocations.forEach((alloc, index) => {
            const batchRef = batchRefs[index];
            const batchData = batchSnapshots[index].data() as StockBatch;
            const newQty = batchData.quantityInBatch - alloc.quantityToDeduct;
            
            // A. Update Batch Stock
            transaction.update(batchRef, {
                quantityInBatch: newQty,
                status: newQty === 0 ? 'Consumed' : 'Active'
            });

            // B. Create Immutable Audit Record
            const newTxRef = doc(logCollectionRef); // Auto-ID
            transaction.set(newTxRef, {
                transactionId: newTxRef.id,
                residentId: meta.residentId,
                consultationId: meta.consultationId,
                prescriptionId: meta.prescriptionId,
                itemId: itemId,
                itemName: meta.itemName,
                batchId: alloc.batchId,
                batchNumber: batchData.batchNumber,
                quantityDispensed: alloc.quantityToDeduct,
                dispensedAt: serverTimestamp(),
                dispensedBy: meta.userId
            });
        });
        
        // C. Optional: Update Parent Item Aggregate (Note: This might be hot-spotted if high volume)
        // For low volume barangay health centers, this is fine.
        // We'll trust client-side aggregation or a cloud function for totalStock usually, 
        // but updating it here keeps the UI snappy without re-reading all batches.
        // transaction.update(itemRef, { totalStock: increment(-totalDispensed) }); 
    });
}
