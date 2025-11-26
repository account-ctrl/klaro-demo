
'use client';

import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { AidProgram, AidClaim } from '@/lib/types';
import { BARANGAY_ID } from './use-barangay-data';

// --- REFS ---

export function useSocialWelfareRef(collectionName: string) {
  const firestore = useFirestore();
  return useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/${collectionName}`);
  }, [firestore, collectionName]);
}

// --- HOOKS ---

export function useAidPrograms() {
    const ref = useSocialWelfareRef('aid_programs');
    const q = useMemoFirebase(() => ref ? query(ref, orderBy('startDate', 'desc')) : null, [ref]);
    return useCollection<AidProgram>(q);
}

export function useAidClaims(programId?: string) {
    const firestore = useFirestore();
    const q = useMemoFirebase(() => {
        if (!firestore) return null;
        const col = collection(firestore, `/barangays/${BARANGAY_ID}/aid_claims`);
        if (programId) {
            return query(col, where('programId', '==', programId), orderBy('dateClaimed', 'desc'));
        }
        return query(col, orderBy('dateClaimed', 'desc'));
    }, [firestore, programId]);
    
    return useCollection<AidClaim>(q);
}

export function useResidentClaims(residentId: string) {
    const firestore = useFirestore();
    const q = useMemoFirebase(() => {
        if (!firestore || !residentId) return null;
        const col = collection(firestore, `/barangays/${BARANGAY_ID}/aid_claims`);
        return query(col, where('residentId', '==', residentId), orderBy('dateClaimed', 'desc'));
    }, [firestore, residentId]);
    
    return useCollection<AidClaim>(q);
}
