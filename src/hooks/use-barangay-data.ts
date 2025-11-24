
'use client';

import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { 
    Resident, 
    CertificateRequest, 
    CertificateType, 
    FinancialTransaction, 
    Household,
    DocumentTemplate
} from '@/lib/types';

// Exported for direct usage in doc() refs if needed, but prefer hooks.
export const BARANGAY_ID = 'barangay_san_isidro';

/**
 * Returns a CollectionReference to a specific barangay collection.
 * Useful for add/update operations.
 */
export function useBarangayRef(collectionName: string) {
  const firestore = useFirestore();

  return useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/${collectionName}`);
  }, [firestore, collectionName]);
}

/**
 * Generic hook to fetch a collection under the current barangay.
 * Abstracts away the firestore instance and path construction.
 */
function useBarangayCollection<T>(collectionName: string) {
  const collectionRef = useBarangayRef(collectionName);
  return useCollection<T>(collectionRef);
}

export function useResidents() {
    return useBarangayCollection<Resident>('residents');
}

export function useDocuments() {
    return useBarangayCollection<CertificateRequest>('certificate_requests');
}

export function useDocumentTypes() {
    return useBarangayCollection<CertificateType>('certificate_types');
}

export function useFinancials() {
    return useBarangayCollection<FinancialTransaction>('financial_transactions');
}

export function useHouseholds() {
    return useBarangayCollection<Household>('households');
}

export function useDocumentTemplates() {
    return useBarangayCollection<DocumentTemplate>('document_templates');
}
