
'use client';

import { collection, query, where, orderBy, getDocs, writeBatch, doc, increment } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { MedicineItem, MedicineBatch, HealthProfile, DispensingLog } from '@/lib/ehealth-types';
import { BARANGAY_ID } from './use-barangay-data';

// --- REFS ---

export function useEHealthRef(collectionName: string) {
  const firestore = useFirestore();
  return useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/${collectionName}`);
  }, [firestore, collectionName]);
}

// --- HOOKS ---

export function useInventoryItems() {
    const ref = useEHealthRef('ehealth_inventory_items');
    return useCollection<MedicineItem>(ref);
}

export function useInventoryBatches(itemId?: string) {
    const firestore = useFirestore();
    const q = useMemoFirebase(() => {
        if (!firestore) return null;
        const col = collection(firestore, `/barangays/${BARANGAY_ID}/ehealth_inventory_batches`);
        if (itemId) {
            return query(col, where('itemId', '==', itemId), orderBy('expiryDate', 'asc'));
        }
        return query(col, orderBy('expiryDate', 'asc'));
    }, [firestore, itemId]);
    
    return useCollection<MedicineBatch>(q);
}

export function useHealthProfiles() {
    const ref = useEHealthRef('ehealth_profiles');
    return useCollection<HealthProfile>(ref);
}

export function useDispensingLogs() {
    const firestore = useFirestore();
    const q = useMemoFirebase(() => {
        if (!firestore) return null;
        const col = collection(firestore, `/barangays/${BARANGAY_ID}/ehealth_dispensing_logs`);
        return query(col, orderBy('dateDispensed', 'desc'));
    }, [firestore]);
    return useCollection<DispensingLog>(q);
}

// --- ACTIONS (Client-side helper for batch logic) ---

/**
 * Helper to find the best batches to deduct from based on FEFO (First Expired First Out).
 * Returns an array of operations to perform.
 */
export const getFefoAllocation = (batches: MedicineBatch[], quantityNeeded: number) => {
    // Filter for active batches only
    const activeBatches = batches
        .filter(b => b.status === 'Active' && b.quantity > 0)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    let remaining = quantityNeeded;
    const allocation: { batch: MedicineBatch, deduct: number }[] = [];

    for (const batch of activeBatches) {
        if (remaining <= 0) break;
        
        const deduct = Math.min(batch.quantity, remaining);
        allocation.push({ batch, deduct });
        remaining -= deduct;
    }

    if (remaining > 0) {
        throw new Error(`Insufficient stock. Missing ${remaining} units.`);
    }

    return allocation;
};
