'use client';

import { query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase } from '@/firebase';
import { Ordinance } from '@/lib/types';
import { useBarangayRef } from './use-barangay-data';

// --- HOOKS ---

export function useLegislativeRef(collectionName: string) {
    return useBarangayRef(collectionName);
}

export function useOrdinances() {
    const ref = useLegislativeRef('ordinances');
    const q = useMemoFirebase(() => ref ? query(ref, orderBy('dateEnacted', 'desc')) : null, [ref]);
    return useCollection<Ordinance>(q);
}
