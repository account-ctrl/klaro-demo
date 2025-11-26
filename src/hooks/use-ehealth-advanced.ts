'use client';

import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { 
    MchRecord, 
    GrowthMeasurement, 
    ImmunizationRecord, 
    EpidemiologyCase, 
    TreatmentLog,
    HealthVital,
    StockBatch
} from '@/lib/ehealth-advanced-types';
import { BARANGAY_ID } from './use-barangay-data';

// --- REFS ---

export function useEHealthAdvancedRef(collectionPath: string) {
  const firestore = useFirestore();
  return useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/${collectionPath}`);
  }, [firestore, collectionPath]);
}

// --- HOOKS: MCH ---

export function useMchRecords() {
    const ref = useEHealthAdvancedRef('mch_records');
    return useCollection<MchRecord>(ref);
}

export function useGrowthMeasurements(mchId: string) {
    const firestore = useFirestore();
    const q = useMemoFirebase(() => {
        if (!firestore || !mchId) return null;
        return collection(firestore, `/barangays/${BARANGAY_ID}/mch_records/${mchId}/growth_measurements`);
    }, [firestore, mchId]);
    // Order by recordedAt desc
    const queryRef = useMemoFirebase(() => q ? query(q, orderBy('recordedAt', 'desc')) : null, [q]);
    return useCollection<GrowthMeasurement>(queryRef);
}

export function useImmunizationRecords(mchId: string) {
    const firestore = useFirestore();
    const q = useMemoFirebase(() => {
        if (!firestore || !mchId) return null;
        return collection(firestore, `/barangays/${BARANGAY_ID}/mch_records/${mchId}/immunization_schedule`);
    }, [firestore, mchId]);
    return useCollection<ImmunizationRecord>(q);
}

// --- HOOKS: Epidemiology ---

export function useEpidemiologyCases() {
    const ref = useEHealthAdvancedRef('epidemiology_cases');
    // Filter for Active cases usually preferred, but generic list for now
    return useCollection<EpidemiologyCase>(ref);
}

export function useTreatmentLogs(caseId: string) {
    const firestore = useFirestore();
    const q = useMemoFirebase(() => {
        if (!firestore || !caseId) return null;
        return collection(firestore, `/barangays/${BARANGAY_ID}/epidemiology_cases/${caseId}/dots_treatment_logs`);
    }, [firestore, caseId]);
    return useCollection<TreatmentLog>(q);
}

// --- HOOKS: Vitals (Sub-collection of Residents) ---

export function useHealthVitals(residentId: string) {
    const firestore = useFirestore();
    const q = useMemoFirebase(() => {
        if (!firestore || !residentId) return null;
        return collection(firestore, `/barangays/${BARANGAY_ID}/residents/${residentId}/health_vitals`);
    }, [firestore, residentId]);
    const queryRef = useMemoFirebase(() => q ? query(q, orderBy('recordedAt', 'desc')) : null, [q]);
    return useCollection<HealthVital>(queryRef);
}

// --- HOOKS: Smart Inventory Batches (Sub-collection of Inventory) ---

export function useStockBatches(itemId: string) {
    const firestore = useFirestore();
    const q = useMemoFirebase(() => {
        if (!firestore || !itemId) return null;
        return collection(firestore, `/barangays/${BARANGAY_ID}/ehealth_inventory_items/${itemId}/stock_batches`);
    }, [firestore, itemId]);
    // Order by expiryDate asc (FEFO)
    const queryRef = useMemoFirebase(() => q ? query(q, orderBy('expiryDate', 'asc')) : null, [q]);
    return useCollection<StockBatch>(queryRef);
}
