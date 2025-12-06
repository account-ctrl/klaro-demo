
'use client';

import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Ordinance } from '@/lib/types';
import { BARANGAY_ID as IMPORTED_BARANGAY_ID } from './use-barangay-data';

export const BARANGAY_ID = IMPORTED_BARANGAY_ID;

// --- REFS ---

export function useLegislativeRef(collectionName: string) {
  const firestore = useFirestore();
  return useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/${collectionName}`);
  }, [firestore, collectionName]);
}

// --- HOOKS ---

export function useOrdinances() {
    const ref = useLegislativeRef('ordinances');
    const q = useMemoFirebase(() => ref ? query(ref, orderBy('dateEnacted', 'desc')) : null, [ref]);
    return useCollection<Ordinance>(q);
}
